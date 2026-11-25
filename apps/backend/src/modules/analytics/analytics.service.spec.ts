import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType, LeadStatus, OrderStatus } from '@prisma/client';

describe('AnalyticsService (Bundle 14 Unit Tests)', () => {
  let service: AnalyticsService;
  let prisma: any;

  const mockPrisma = {
    lead: {
      count: jest.fn(),
    },
    leadSource: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    inventory: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
    callLog: {
      count: jest.fn(),
    },
    followUp: {
      count: jest.fn(),
    },
    pendingReview: {
      count: jest.fn(),
    },
    approvalRequest: {
      count: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    productCategory: {
      findMany: jest.fn(),
    },
    invoice: {
      aggregate: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAdminDashboard', () => {
    it('should aggregate system-wide metrics and include source distribution', async () => {
      prisma.lead.count.mockResolvedValue(100);
      prisma.leadSource.findMany.mockResolvedValue([
        {
          id: 'src-1',
          name: 'Meta Ads',
          sourceType: 'FACEBOOK_ADS',
          _count: { leads: 50 },
        },
      ]);
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-sales-1',
          employeeCode: 'MEL-SAL-001',
          firstName: 'Ramesh',
          lastName: 'Patel',
          isActive: true,
          _count: { assignedLeads: 20, callLogs: 45 },
        },
      ]);
      prisma.order.count.mockResolvedValue(15);
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 75000 } });
      prisma.inventory.findMany.mockResolvedValue([
        { availableQuantity: 10, lowStockThreshold: 20 },
      ]);
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getAdminDashboard();

      expect(result.overview.totalLeads).toBe(100);
      expect(result.overview.lowStockAlerts).toBe(1);
      expect(result.sourceDistribution).toHaveLength(1);
      expect(result.sourceDistribution[0].sourceName).toBe('Meta Ads');
      expect(result.sourceDistribution[0].percentage).toBe(50);
      expect(result.salesTeamPerformance).toHaveLength(1);
      expect(result.salesTeamPerformance[0].employeeCode).toBe('MEL-SAL-001');
    });
  });

  describe('getSalesDashboard (Strict Zero Lead Source Data)', () => {
    it('should return salesperson pipeline with STRICT ZERO lead source data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-sales-1',
        employeeCode: 'MEL-SAL-001',
        firstName: 'Ramesh',
        lastName: 'Patel',
      });
      prisma.lead.count.mockResolvedValue(25);
      prisma.callLog.count.mockResolvedValue(10);
      prisma.followUp.count.mockResolvedValue(3);

      const result = await service.getSalesDashboard('user-sales-1');

      expect(result.salesperson.employeeCode).toBe('MEL-SAL-001');
      expect(result.pipeline.totalAssigned).toBe(25);
      expect(result.todayActivity.callsLoggedToday).toBe(10);

      // STRICT ZERO LEAD SOURCE DATA VERIFICATION
      const resultString = JSON.stringify(result).toLowerCase();
      expect(resultString).not.toContain('leadsource');
      expect(resultString).not.toContain('sourcetype');
      expect(resultString).not.toContain('campaign');
      expect(resultString).not.toContain('facebook');
      expect(resultString).not.toContain('costperlead');
      expect((result as any).sourceDistribution).toBeUndefined();
    });
  });

  describe('getPendingReviewDashboard', () => {
    it('should calculate pending review queue metrics and overdue reviews', async () => {
      prisma.lead.count
        .mockResolvedValueOnce(8)  // totalPendingQueue
        .mockResolvedValueOnce(3)  // inReviewQueue
        .mockResolvedValueOnce(2)  // urgentPendingCount
        .mockResolvedValueOnce(4); // highPendingCount
      prisma.pendingReview.count
        .mockResolvedValueOnce(1)  // overdueReviewsCount
        .mockResolvedValueOnce(5)  // decidedToday
        .mockResolvedValueOnce(4)  // approvedToday
        .mockResolvedValueOnce(1)  // rejectedToday
        .mockResolvedValueOnce(0)  // followUpRequestedToday
        .mockResolvedValueOnce(0); // sendBackToday

      const result = await service.getPendingReviewDashboard('user-pnd-1');

      expect(result.queue.totalPendingInQueue).toBe(8);
      expect(result.queue.underReviewCount).toBe(3);
      expect(result.queue.totalOpenWorkload).toBe(11);
      expect(result.queue.overdueReviewsCount).toBe(1);
      expect(result.todayActivity.totalDecidedToday).toBe(5);
      expect(result.todayActivity.approvedToday).toBe(4);
      expect(result.todayActivity.approvalRateToday).toBe(80);
    });
  });

  describe('getApprovalDashboard', () => {
    it('should calculate approval metrics and commercial totals', async () => {
      prisma.approvalRequest.count
        .mockResolvedValueOnce(6)  // totalPendingApproval
        .mockResolvedValueOnce(4)  // decidedToday
        .mockResolvedValueOnce(3)  // approvedToday
        .mockResolvedValueOnce(1)  // rejectedToday
        .mockResolvedValueOnce(0); // sendBackToday
      prisma.productCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Sandhivata', _count: { products: 3 } },
      ]);
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 45000 } });

      const result = await service.getApprovalDashboard('user-apr-1');

      expect(result.queue.totalPendingApproval).toBe(6);
      expect(result.todayActivity.approvedToday).toBe(3);
      expect(result.todayActivity.approvalRate).toBe(75);
      expect(result.commercialImpact.totalApprovedOrderValue).toBe(45000);
      expect(result.diseaseCategories).toHaveLength(1);
    });
  });

  describe('getManagementDashboard', () => {
    it('should aggregate fulfillment, GST tax totals, and low stock items', async () => {
      prisma.customer.count.mockResolvedValue(120);
      prisma.order.count
        .mockResolvedValueOnce(50)  // total
        .mockResolvedValueOnce(5)   // draft
        .mockResolvedValueOnce(10)  // confirmed
        .mockResolvedValueOnce(5)   // processing
        .mockResolvedValueOnce(10)  // shipped
        .mockResolvedValueOnce(18)  // delivered
        .mockResolvedValueOnce(2)   // cancelled
        .mockResolvedValueOnce(0);  // returned
      prisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 250000 } })
        .mockResolvedValueOnce({ _sum: { totalAmount: 90000 } });
      prisma.invoice.aggregate.mockResolvedValue({
        _sum: {
          totalTax: 30000,
          cgstAmount: 10000,
          sgstAmount: 10000,
          igstAmount: 10000,
          grandTotal: 280000,
        },
      });
      prisma.inventory.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          availableQuantity: 5,
          reservedQuantity: 2,
          lowStockThreshold: 10,
          product: { name: 'Joint Care Oil', sku: 'SKU-01' },
        },
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: 40, totalPrice: 40000 } },
      ]);
      prisma.product.findUnique.mockResolvedValue({
        name: 'Joint Care Oil',
        sku: 'SKU-01',
      });

      const result = await service.getManagementDashboard();

      expect(result.customers.totalCustomers).toBe(120);
      expect(result.orders.totalOrders).toBe(50);
      expect(result.orders.deliveredOrders).toBe(18);
      // attempted = 18 + 0 + 2 = 20. 18 / 20 = 90%
      expect(result.orders.deliverySuccessRate).toBe(90);
      expect(result.financials.grossRevenue).toBe(250000);
      expect(result.financials.deliveredRevenue).toBe(90000);
      expect(result.financials.cgstCollected).toBe(10000);
      expect(result.financials.sgstCollected).toBe(10000);
      expect(result.financials.igstCollected).toBe(10000);
      expect(result.inventoryHealth.lowStockCount).toBe(1);
      expect(result.topSellingProducts[0].productName).toBe('Joint Care Oil');
    });
  });

  describe('getDashboard dispatcher', () => {
    it('should delegate to getSalesDashboard when user is SALESPERSON', async () => {
      const spy = jest.spyOn(service, 'getSalesDashboard').mockResolvedValue({} as any);
      await service.getDashboard({ id: 'sales-1', role: RoleType.SALESPERSON });
      expect(spy).toHaveBeenCalledWith('sales-1');
    });

    it('should delegate to getAdminDashboard when user is SUPER_ADMIN', async () => {
      const spy = jest.spyOn(service, 'getAdminDashboard').mockResolvedValue({} as any);
      await service.getDashboard({ id: 'admin-1', role: RoleType.SUPER_ADMIN });
      expect(spy).toHaveBeenCalled();
    });
  });
});
