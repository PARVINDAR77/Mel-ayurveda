import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InventoryTxType } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all disease categories
   */
  async getCategories() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates a new therapeutic disease category
   */
  async createCategory(name: string, description?: string) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      throw new ConflictException(`Category with name "${name}" already exists`);
    }

    return this.prisma.productCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Updates an existing therapeutic disease category
   */
  async updateCategory(id: string, name?: string, description?: string, isActive?: boolean) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Disease Category with ID "${id}" not found`);
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await this.prisma.productCategory.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Category "${name}" already exists`);
      }
    }

    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description?.trim() : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    this.logger.log(`Disease Category updated: ${updated.name} (${updated.id})`);
    return updated;
  }

  /**
   * Deletes a therapeutic disease category
   */
  async deleteCategory(id: string, force: boolean) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Disease Category with ID "${id}" not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (existing._count.products > 0) {
        if (!force) {
          // Soft-delete / deactivate category
          await tx.productCategory.update({
            where: { id },
            data: { isActive: false },
          });

          return {
            success: true,
            action: 'ARCHIVED',
            message: `Disease Category "${existing.name}" has ${existing._count.products} products and was archived.`,
            category: existing,
          };
        }

        // Force delete: reassign products to default 'General Health Care' category
        let defaultCategory = await tx.productCategory.findFirst({
          where: { name: 'General Health Care' },
        });

        if (!defaultCategory) {
          defaultCategory = await tx.productCategory.create({
            data: {
              name: 'General Health Care',
              description: 'General therapeutic formulations',
            },
          });
        }

        await tx.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: defaultCategory.id },
        });
      }

      await tx.productCategory.delete({
        where: { id },
      });

      this.logger.log(`Disease Category deleted: ${existing.name} (${existing.id})`);
      return {
        success: true,
        action: 'DELETED',
        message: `Disease Category "${existing.name}" was permanently deleted.`,
        category: existing,
      };
    });
  }

  /**
   * Generates next sequential SKU
   */
  async generateNextSku(): Promise<string> {
    const products = await this.prisma.product.findMany({
      select: { sku: true },
    });
    let maxNumber = 0;
    for (const p of products) {
      const match = p.sku.match(/MEL-(?:AYUR-)?(\d+)/i) || p.sku.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    const nextNum = (maxNumber + 1).toString().padStart(3, '0');
    return `MEL-AYUR-${nextNum}`;
  }

  /**
   * Registers a new Ayurvedic formulation and initializes warehouse inventory ledger
   */
  async createProduct(dto: CreateProductDto, user: AuthenticatedUser) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
    }

    const skuToUse = dto.sku ? dto.sku.trim().toUpperCase() : await this.generateNextSku();

    const existingSku = await this.prisma.product.findUnique({
      where: { sku: skuToUse },
    });

    if (existingSku) {
      throw new ConflictException(`Product with SKU "${skuToUse}" already exists`);
    }

    const initialStock = dto.initialStock !== undefined ? dto.initialStock : 100;
    const finalMrp = dto.mrpPrice !== undefined ? dto.mrpPrice : (dto.mrp !== undefined ? dto.mrp : dto.sellingPrice);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          sku: skuToUse,
          name: dto.name.trim(),
          categoryId: category.id,
          description: dto.description?.trim(),
          targetDisease: dto.targetDisease?.trim(),
          dosageInstructions: dto.dosageInstructions?.trim(),
          ingredients: dto.ingredients?.trim(),
          dosageForm: dto.dosageForm?.trim(),
          imageUrl: dto.imageUrl?.trim(),
          mrpPrice: finalMrp,
          sellingPrice: dto.sellingPrice,
          gstRate: dto.gstRate !== undefined ? dto.gstRate : 12.0,
        },
        include: {
          category: true,
        },
      });

      // 2. Initialize Inventory ledger
      const inventory = await tx.inventory.create({
        data: {
          productId: product.id,
          availableQuantity: initialStock,
          reservedQuantity: 0,
          lowStockThreshold: 20,
        },
      });

      // 3. Log initial replenishment transaction
      if (initialStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: InventoryTxType.RESTOCK,
            quantity: initialStock,
            balanceAfter: initialStock,
            notes: `Initial warehouse batch replenishment by ${user.employeeCode}`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PRODUCT_CREATED',
          entityType: 'Product',
          entityId: product.id,
          newState: { sku: product.sku, name: product.name, initialStock },
        },
      });

      this.logger.log(
        `Ayurvedic product created: ${product.name} (SKU: ${product.sku}) with ${initialStock} units in stock`,
      );

      return {
        ...product,
        inventory,
      };
    });
  }

  /**
   * Retrieves list of products with filters, stock levels, and pagination
   */
  async findAll(query: ProductQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { targetDisease: { contains: s, mode: 'insensitive' } },
        { ingredients: { contains: s, mode: 'insensitive' } },
        { dosageForm: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          inventory: {
            select: {
              availableQuantity: true,
              reservedQuantity: true,
              lowStockThreshold: true,
            },
          },
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves detailed formulation profile
   */
  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Updates formulation details or pricing
   */
  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    user: AuthenticatedUser,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim() || product.name,
        description:
          dto.description !== undefined ? dto.description?.trim() : product.description,
        targetDisease:
          dto.targetDisease !== undefined ? dto.targetDisease?.trim() : product.targetDisease,
        dosageInstructions:
          dto.dosageInstructions !== undefined ? dto.dosageInstructions?.trim() : product.dosageInstructions,
        ingredients:
          dto.ingredients !== undefined ? dto.ingredients?.trim() : product.ingredients,
        dosageForm:
          dto.dosageForm !== undefined ? dto.dosageForm?.trim() : product.dosageForm,
        imageUrl:
          dto.imageUrl !== undefined ? dto.imageUrl?.trim() : product.imageUrl,
        mrpPrice: dto.mrpPrice !== undefined ? dto.mrpPrice : product.mrpPrice,
        sellingPrice:
          dto.sellingPrice !== undefined ? dto.sellingPrice : product.sellingPrice,
        gstRate: dto.gstRate !== undefined ? dto.gstRate : product.gstRate,
        isActive: dto.isActive !== undefined ? dto.isActive : product.isActive,
      },
      include: {
        category: true,
        inventory: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: product.id,
        newState: { sku: product.sku, updatedFields: JSON.parse(JSON.stringify(dto)) },
      },
    });

    return updated;
  }

  /**
   * Deletes an Ayurvedic product formulation and associated warehouse records
   */
  async deleteProduct(id: string, force: boolean, user: AuthenticatedUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. If product has order items
      if (product._count.orderItems > 0) {
        if (!force) {
          // Soft-delete / deactivate if not forced
          await tx.product.update({
            where: { id },
            data: { isActive: false },
          });

          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: 'PRODUCT_ARCHIVED',
              entityType: 'Product',
              entityId: product.id,
              newState: { sku: product.sku, name: product.name },
            },
          });

          return {
            success: true,
            action: 'ARCHIVED',
            message: `Product ${product.name} (${product.sku}) has been archived because it is referenced in past orders.`,
            product: { id, sku: product.sku, name: product.name },
          };
        }

        // Force delete: clean up linked order items
        await tx.orderItem.deleteMany({
          where: { productId: id },
        });
      }

      // 2. Clean up inventory transactions and inventory record
      if (product.inventory) {
        await tx.inventoryTransaction.deleteMany({
          where: { inventoryId: product.inventory.id },
        });
        await tx.inventory.delete({
          where: { id: product.inventory.id },
        });
      }

      // 3. Delete the product
      await tx.product.delete({
        where: { id },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PRODUCT_DELETED',
          entityType: 'Product',
          entityId: product.id,
          newState: { sku: product.sku, name: product.name },
        },
      });

      this.logger.log(`Ayurvedic product deleted: ${product.name} (SKU: ${product.sku}) by ${user.employeeCode}`);

      return {
        success: true,
        action: 'DELETED',
        message: `Product ${product.name} (${product.sku}) was successfully deleted.`,
        product: { id, sku: product.sku, name: product.name },
      };
    });
  }
}
