import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { InventoryService } from './inventory.service';
import { DispatchService } from './dispatch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, RoleType, ShipmentStatus } from '@prisma/client';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('OperationsModule Unit Tests (Bundle 13)', () => {
  let invoicesService: InvoicesService;
  let inventoryService: InventoryService;
  let dispatchService: DispatchService;
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

  const mockOrderGujarat = {
    id: 'ord-1',
    orderNumber: 'MEL-ORD-2026-000101',
    status: OrderStatus.CONFIRMED,
    subtotal: 1000,
    taxAmount: 120,
    totalAmount: 1120,
    customer: { state: 'Gujarat' },
    invoice: null,
    shipment: null,
    items: [],
  };

  const mockOrderOutstate = {
    id: 'ord-2',
    orderNumber: 'MEL-ORD-2026-000102',
    status: OrderStatus.CONFIRMED,
    subtotal: 1000,
    taxAmount: 120,
    totalAmount: 1120,
    customer: { state: 'Rajasthan' },
    invoice: null,
    shipment: null,
    items: [],
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      inventoryTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      shipment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        InventoryService,
        DispatchService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    invoicesService = module.get<InvoicesService>(InvoicesService);
    inventoryService = module.get<InventoryService>(InventoryService);
    dispatchService = module.get<DispatchService>(DispatchService);
  });

  describe('InvoicesService', () => {
    it('should calculate CGST + SGST (50% each) for intra-state order (Gujarat)', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderGujarat);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.create.mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'inv-1' }));

      const inv = await invoicesService.generateInvoice('ord-1', mockUserMgmt);
      expect(inv.cgstAmount).toBe(60);
      expect(inv.sgstAmount).toBe(60);
      expect(inv.igstAmount).toBe(0);
      expect(prisma.invoice.create).toHaveBeenCalled();
    });

    it('should calculate IGST (100%) for inter-state order (Rajasthan)', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderOutstate);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.create.mockImplementation(({ data }: any) => Promise.resolve({ ...data, id: 'inv-2' }));

      const inv = await invoicesService.generateInvoice('ord-2', mockUserMgmt);
      expect(inv.cgstAmount).toBe(0);
      expect(inv.sgstAmount).toBe(0);
      expect(inv.igstAmount).toBe(120);
    });

    it('should throw BadRequestException if order is in DRAFT status', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrderGujarat,
        status: OrderStatus.DRAFT,
      });

      await expect(
        invoicesService.generateInvoice('ord-1', mockUserMgmt),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('InventoryService', () => {
    it('should restock inventory and log restock transaction', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-1',
        productId: 'prod-1',
        availableQuantity: 50,
        product: { sku: 'MEL-AYUR-001' },
      });
      prisma.inventory.update.mockResolvedValue({
        id: 'inv-1',
        availableQuantity: 100,
      });

      const res = await inventoryService.restock(
        { productId: 'prod-1', quantity: 50, batchNumber: 'BATCH-01' },
        mockUserMgmt,
      );

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { availableQuantity: 100 },
      });
      expect(prisma.inventoryTransaction.create).toHaveBeenCalled();
    });
  });

  describe('DispatchService', () => {
    it('should create shipment and transition order status to SHIPPED', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderGujarat);
      prisma.shipment.findUnique.mockResolvedValue(null);
      prisma.shipment.create.mockResolvedValue({
        id: 'ship-1',
        orderId: 'ord-1',
        courierPartner: 'Delhivery',
        trackingAwb: 'DLV123',
        status: ShipmentStatus.MANIFESTED,
      });

      const res = await dispatchService.createShipment(
        'ord-1',
        { courierPartner: 'Delhivery', trackingAwb: 'DLV123' },
        mockUserMgmt,
      );

      expect(res.trackingAwb).toBe('DLV123');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { status: OrderStatus.SHIPPED },
      });
    });
  });
});
