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
}
