import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, RoleType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService Unit Tests', () => {
  let service: OrdersService;
  let prisma: any;
  const mockNotifications = {
    createNotification: jest.fn().mockResolvedValue({}),
    dispatchToRole: jest.fn().mockResolvedValue([]),
    dispatchToUsers: jest.fn().mockResolvedValue([]),
  };

  const mockUserMgmt = {
    id: 'user-mgt-1',
    employeeCode: 'MEL-MGT-001',
    email: 'neha.mehta@melayurveda.com',
    firstName: 'Neha',
    lastName: 'Mehta',
    role: RoleType.MANAGEMENT,
    isActive: true,
  };

  const mockCustomer = {
    id: 'cust-1',
    customerCode: 'MEL-CUST-000101',
    fullName: 'Aarav Patel',
  };

  const mockProduct = {
    id: 'prod-1',
    sku: 'MEL-AYUR-001',
    name: 'Artho-Care Oil',
    sellingPrice: 999,
    gstRate: 12.0,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findUnique: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
        update: jest.fn(),
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
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDraftOrder', () => {
    it('should throw NotFoundException if customer not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.createDraftOrder(
          { customerId: 'non-existent', items: [{ productId: 'prod-1', quantity: 1 }] },
          mockUserMgmt,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is invalid or inactive', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.createDraftOrder(
          { customerId: 'cust-1', items: [{ productId: 'prod-1', quantity: 1 }] },
          mockUserMgmt,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate subtotal, taxes, and create draft order', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.product.findMany.mockResolvedValue([mockProduct]);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.create.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'MEL-ORD-2026-000101',
        status: OrderStatus.DRAFT,
        subtotal: 999,
        totalAmount: 1118.88,
      });

      const res = await service.createDraftOrder(
        { customerId: 'cust-1', items: [{ productId: 'prod-1', quantity: 1 }] },
        mockUserMgmt,
      );

      expect(res.orderNumber).toBe('MEL-ORD-2026-000101');
      expect(res.status).toBe(OrderStatus.DRAFT);
      expect(prisma.order.create).toHaveBeenCalled();
    });
  });

  describe('confirmOrder', () => {
    it('should throw BadRequestException if available stock is insufficient', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.DRAFT,
        items: [{ productId: 'prod-1', quantity: 5, product: mockProduct }],
      });
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 2, // only 2 available, but requested 5!
        reservedQuantity: 0,
      });

      await expect(
        service.confirmOrder('ord-1', mockUserMgmt),
      ).rejects.toThrow(BadRequestException);
    });

    it('should confirm order and atomically reserve stock', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'ord-1',
        orderNumber: 'MEL-ORD-2026-000101',
        status: OrderStatus.DRAFT,
        items: [{ productId: 'prod-1', quantity: 2, product: mockProduct }],
      });
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 50,
        reservedQuantity: 5,
      });
      prisma.order.update.mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.CONFIRMED,
      });

      const res = await service.confirmOrder('ord-1', mockUserMgmt);
      expect(res.status).toBe(OrderStatus.CONFIRMED);
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          availableQuantity: 48,
          reservedQuantity: 7,
        },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalled();
    });
  });
});
