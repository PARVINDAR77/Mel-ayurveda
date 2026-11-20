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
    const inventory = await this.prisma.inventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            mrpPrice: true,
            sellingPrice: true,
            isActive: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { availableQuantity: 'asc' },
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
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId: dto.productId },
      include: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory for product ID ${dto.productId} not found`);
    }

    const newAvailable = inventory.availableQuantity + dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      const updatedInv = await tx.inventory.update({
        where: { id: inventory.id },
        data: { availableQuantity: newAvailable },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          type: InventoryTxType.RESTOCK,
          quantity: dto.quantity,
          balanceAfter: newAvailable,
          notes: dto.notes
            ? `${dto.notes}${dto.batchNumber ? ` [Batch: ${dto.batchNumber}]` : ''}`
            : dto.batchNumber ? `Batch ${dto.batchNumber}` : `Replenished by ${user.employeeCode}`,
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
