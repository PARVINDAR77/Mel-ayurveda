import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsService } from './returns.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ReturnStatus, ReturnReason, OrderStatus, RoleType } from '@prisma/client';

describe('ReturnsService Unit Tests', () => {
  let service: ReturnsService;
  let prisma: any;

  const mockUser = {
    id: 'user-mgt-1',
    employeeCode: 'MEL-MGT-001',
    email: 'neha.mehta@melayurveda.com',
    firstName: 'Neha',
    lastName: 'Mehta',
    role: RoleType.MANAGEMENT,
    isActive: true,
  };

  const mockOrder = {
    id: 'ord-100',
    orderNumber: 'MEL-ORD-2026-000100',
    status: OrderStatus.SHIPPED,
    totalAmount: 1400,
    customer: { fullName: 'Rajesh Varma', phoneNumber: '9855864061' },
    shipment: { id: 'ship-100', trackingAwb: 'DLV999', status: 'IN_TRANSIT' },
    items: [
      { id: 'item-1', productId: 'prod-1', quantity: 2 },
    ],
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(mockOrder),
        update: jest.fn().mockResolvedValue(mockOrder),
      },
      orderReturn: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { returnFeeCharged: 0 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      shipment: {
        update: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv-1',
          productId: 'prod-1',
          availableQuantity: 50,
          reservedQuantity: 2,
        }),
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
        ReturnsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
  });

  it('should initiate a return case with code MEL-RET-YYYY-000001', async () => {
    prisma.orderReturn.create.mockResolvedValue({
      id: 'ret-1',
      returnCode: `MEL-RET-${new Date().getFullYear()}-000001`,
      orderId: 'ord-100',
      status: ReturnStatus.PENDING_CALL,
      returnReason: ReturnReason.CUSTOMER_REFUSED,
    });

    const result = await service.initiateReturn(
      { orderId: 'ord-100', returnReason: ReturnReason.CUSTOMER_REFUSED, remarks: 'Client refused parcel' },
      mockUser,
    );

    expect(result.returnCode).toContain('MEL-RET-');
    expect(result.status).toBe(ReturnStatus.PENDING_CALL);
    expect(prisma.orderReturn.create).toHaveBeenCalled();
  });

  it('should log a customer phone call and update status to CALL_CONNECTED', async () => {
    prisma.orderReturn.findUnique.mockResolvedValue({
      id: 'ret-1',
      returnCode: 'MEL-RET-2026-000001',
      orderId: 'ord-100',
      status: ReturnStatus.PENDING_CALL,
    });

    prisma.orderReturn.update.mockResolvedValue({
      id: 'ret-1',
      returnCode: 'MEL-RET-2026-000001',
      callOutcome: 'CONNECTED',
      status: ReturnStatus.CALL_CONNECTED,
      returnReason: ReturnReason.FINANCIAL_ISSUE,
      customerRemarks: 'Cash not arranged',
    });

    const updated = await service.logCall(
      'ret-1',
      {
        callOutcome: 'CONNECTED',
        returnReason: ReturnReason.FINANCIAL_ISSUE,
        customerRemarks: 'Cash not arranged',
      },
      mockUser,
    );

    expect(updated.status).toBe(ReturnStatus.CALL_CONNECTED);
    expect(updated.returnReason).toBe(ReturnReason.FINANCIAL_ISSUE);
  });

  it('should resolve return with RESTOCKED_AND_CLOSED and restock inventory', async () => {
    prisma.orderReturn.findUnique.mockResolvedValue({
      id: 'ret-1',
      returnCode: 'MEL-RET-2026-000001',
      orderId: 'ord-100',
      isRestocked: false,
      returnFeeCharged: 0,
      order: mockOrder,
      shipment: mockOrder.shipment,
    });

    prisma.orderReturn.update.mockResolvedValue({
      id: 'ret-1',
      returnCode: 'MEL-RET-2026-000001',
      status: ReturnStatus.RESTOCKED_AND_CLOSED,
      isRestocked: true,
      returnFeeCharged: 150,
    });

    const resolved = await service.resolveReturn(
      'ret-1',
      {
        resolutionStatus: ReturnStatus.RESTOCKED_AND_CLOSED,
        returnFeeCharged: 150,
        feePaymentMode: 'UPI',
        feePaymentRef: 'UPI123456',
      },
      mockUser,
    );

    expect(resolved.status).toBe(ReturnStatus.RESTOCKED_AND_CLOSED);
    expect(resolved.isRestocked).toBe(true);
    expect(prisma.inventory.update).toHaveBeenCalled();
    expect(prisma.inventoryTransaction.create).toHaveBeenCalled();
  });
});
