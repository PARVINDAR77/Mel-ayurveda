import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RestockInventoryDto } from './dto/restock-inventory.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InventoryTxType } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves warehouse stock levels across all SKUs with low-stock alerts
   */
  async getInventoryLevels() {
    // 1. Ensure all active products have an inventory record
    const allProducts = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { inventory: true },
    });

    for (const p of allProducts) {
      if (!p.inventory) {
        await this.prisma.inventory.create({
          data: {
            productId: p.id,
            availableQuantity: 100, // Default healthy starting stock
            reservedQuantity: 0,
            lowStockThreshold: 20,
          },
        }).catch(() => null);
      }
    }

    const inventory = await this.prisma.inventory.findMany({
      where: { product: { isActive: true } },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            mrpPrice: true,
            sellingPrice: true,
            isActive: true,
            targetDisease: true,
            gstRate: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = inventory.map((inv) => ({
      ...inv,
      isLowStock: inv.availableQuantity <= inv.lowStockThreshold,
    }));

    return formatted;
  }

  /**
   * Records factory / vendor warehouse replenishment transaction
   */
  async restock(dto: RestockInventoryDto, user: AuthenticatedUser) {
    let inventory = await this.prisma.inventory.findUnique({
      where: { productId: dto.productId },
      include: { product: true },
    });

    if (!inventory) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found`);
      }
      inventory = await this.prisma.inventory.create({
        data: {
          productId: dto.productId,
          availableQuantity: 0,
          reservedQuantity: 0,
          lowStockThreshold: 20,
        },
        include: { product: true },
      });
    }

    const newAvailable = inventory.availableQuantity + dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      const updatedInv = await tx.inventory.update({
        where: { id: inventory.id },
        data: { availableQuantity: newAvailable },
      });

      const noteParts: string[] = [];
      if (dto.batchNumber) noteParts.push(`Batch: ${dto.batchNumber}`);
      if (dto.expiryDate) noteParts.push(`Exp: ${dto.expiryDate.slice(0, 10)}`);
      if (dto.notes) noteParts.push(dto.notes);
      const noteStr = noteParts.length > 0 ? noteParts.join(' | ') : `Replenished by ${user.employeeCode}`;

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          type: InventoryTxType.RESTOCK,
          quantity: dto.quantity,
          balanceAfter: newAvailable,
          notes: noteStr.slice(0, 255),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'INVENTORY_RESTOCKED',
          entityType: 'Inventory',
          entityId: inventory.id,
          newState: {
            sku: inventory.product.sku,
            addedQuantity: dto.quantity,
            newBalance: newAvailable,
            batchNumber: dto.batchNumber,
            restockedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Product ${inventory.product.sku} restocked with ${dto.quantity} units. New available balance: ${newAvailable}`,
      );

      return {
        inventory: updatedInv,
        transaction,
      };
    });
  }

  /**
   * Retrieves chronological inventory ledger transactions
   */
  async getTransactions(productId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (productId) {
      const inv = await this.prisma.inventory.findUnique({ where: { productId } });
      if (inv) where.inventoryId = inv.id;
    }

    const [total, transactions] = await Promise.all([
      this.prisma.inventoryTransaction.count({ where }),
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          inventory: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
