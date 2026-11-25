import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RecycleBinService } from '../recycle-bin/recycle-bin.service';
import { RoleType } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ProductsService Unit Tests', () => {
  let service: ProductsService;
  let prisma: any;

  const mockUserMgmt = {
    id: 'user-mgt-1',
    employeeCode: 'MEL-MGT-001',
    email: 'neha.mehta@melayurveda.com',
    firstName: 'Neha',
    lastName: 'Mehta',
    role: RoleType.MANAGEMENT,
    isActive: true,
  };

  const mockCategory = {
    id: 'cat-1',
    name: 'Joint & Bone Health',
  };

  beforeEach(async () => {
    prisma = {
      productCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      inventory: {
        create: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RecycleBinService,
          useValue: { archiveRecord: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    it('should throw NotFoundException if category not found', async () => {
      prisma.productCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.createProduct(
          {
            sku: 'SKU-001',
            name: 'Oil',
            categoryId: 'cat-non-existent',
            mrpPrice: 500,
            sellingPrice: 400,
          },
          mockUserMgmt,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if SKU already exists', async () => {
      prisma.productCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', sku: 'SKU-001' });

      await expect(
        service.createProduct(
          {
            sku: 'SKU-001',
            name: 'Oil',
            categoryId: 'cat-1',
            mrpPrice: 500,
            sellingPrice: 400,
          },
          mockUserMgmt,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should create product, initialize inventory ledger, and log transaction', async () => {
      prisma.productCategory.findUnique.mockResolvedValue(mockCategory);
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'prod-1',
        sku: 'MEL-AYUR-001',
        name: 'Artho-Care Oil',
        categoryId: mockCategory.id,
        mrpPrice: 1299,
        sellingPrice: 999,
      });
      prisma.inventory.create.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 150,
      });

      const res = await service.createProduct(
        {
          sku: 'MEL-AYUR-001',
          name: 'Artho-Care Oil',
          categoryId: mockCategory.id,
          mrpPrice: 1299,
          sellingPrice: 999,
          initialStock: 150,
        },
        mockUserMgmt,
      );

      expect(res.sku).toBe('MEL-AYUR-001');
      expect(prisma.product.create).toHaveBeenCalled();
      expect(prisma.inventory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-1',
          availableQuantity: 150,
        }),
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalled();
    });
  });
});
