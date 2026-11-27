import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType, LeadStatus, OrderStatus, ShipmentStatus, FollowUpStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dynamic dashboard dispatcher based on authenticated user's role
   */
  async getDashboard(user: any) {
    switch (user.role) {
      case RoleType.SUPER_ADMIN:
        return this.getAdminDashboard();
      case RoleType.SALESPERSON:
        return this.getSalesDashboard(user.id);
      case RoleType.PENDING_REVIEWER:
        return this.getPendingReviewDashboard(user.id);
      case RoleType.APPROVAL_OFFICER:
        return this.getApprovalDashboard(user.id);
      case RoleType.MANAGEMENT:
        return this.getManagementDashboard();
      default:
        throw new ForbiddenException('User role is not authorized for any dashboard view');
    }
  }

  /**
   * Panel 01: Super Admin Executive Master Dashboard
   */
  async getAdminDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Lead, Order, Call, and Approval metrics
    const [
      totalLeads,
      leadsThisMonth,
      convertedLeads,
      pendingReviewLeads,
      approvalRequestedLeads,
      approvedLeads,
      rejectedLeads,
      leadSources,
      salespeople,
      totalOrders,
      confirmedOrders,
      draftOrders,
      orderAggregates,
      todaysSalesAggregate,
      monthlySalesAggregate,
      totalCalls,
      callsToday,
      pendingApprovals,
      recentOrders,
      inventorySummary,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.lead.count({ where: { status: LeadStatus.CONVERTED } }),
      this.prisma.lead.count({ where: { status: { in: [LeadStatus.PENDING_REVIEW, LeadStatus.UNDER_REVIEW] } } }),
      this.prisma.lead.count({ where: { status: LeadStatus.APPROVAL_REQUESTED } }),
      this.prisma.lead.count({ where: { status: LeadStatus.APPROVED } }),
      this.prisma.lead.count({ where: { status: LeadStatus.REJECTED } }),
      this.prisma.leadSource.findMany({
        include: {
          _count: { select: { leads: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: RoleType.SALESPERSON },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          isActive: true,
          _count: {
            select: {
              assignedLeads: true,
              callLogs: true,
            },
          },
        },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.DRAFT } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          OR: [
            { createdAt: { gte: todayStart, lte: todayEnd } },
            { updatedAt: { gte: todayStart, lte: todayEnd } },
          ],
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          OR: [
            { createdAt: { gte: startOfMonth } },
            { updatedAt: { gte: startOfMonth } },
          ],
        },
      }),
      this.prisma.callLog.count(),
      this.prisma.callLog.count({
        where: { calledAt: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.approvalRequest.count({
        where: { decision: null },
      }),
      this.prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              fullName: true,
              phoneNumber: true,
              city: true,
              state: true,
            },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      }),
      this.prisma.inventory.findMany({
        select: {
          availableQuantity: true,
          lowStockThreshold: true,
        },
      }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { employeeCode: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    // Lead Source breakdown (Admin ONLY)
    const sourceDistribution = leadSources.map((source) => ({
      sourceId: source.id,
      sourceName: source.name,
      channel: source.sourceType,
      leadsCount: source._count.leads,
      percentage: totalLeads > 0 ? Number(((source._count.leads / totalLeads) * 100).toFixed(1)) : 0,
    }));

    // Sales team performance overview
    const salesTeamPerformance = await Promise.all(
      salespeople.map(async (rep) => {
        const conversions = await this.prisma.lead.count({
          where: {
            assignedToId: rep.id,
            status: LeadStatus.CONVERTED,
          },
        });
        const conversionRate =
          rep._count.assignedLeads > 0
            ? Number(((conversions / rep._count.assignedLeads) * 100).toFixed(1))
            : 0;

        return {
          id: rep.id,
          employeeCode: rep.employeeCode,
          name: `${rep.firstName} ${rep.lastName}`,
          isActive: rep.isActive,
          assignedLeads: rep._count.assignedLeads,
          callsLogged: rep._count.callLogs,
          conversions,
          conversionRate,
        };
      }),
    );

    const overallConversionRate =
      totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    const lowStockAlerts = inventorySummary.filter(
      (item) => item.availableQuantity <= item.lowStockThreshold,
    ).length;

    return {
      overview: {
        totalLeads,
        leadsThisMonth,
        convertedLeads,
        pendingReviewLeads,
        approvalRequestedLeads,
        approvedLeads,
        rejectedLeads,
        overallConversionRate,
        totalOrders,
        confirmedOrders,
        draftOrders,
        grossSalesRevenue: Number(orderAggregates._sum.totalAmount || 0),
        todaysSales: Number(todaysSalesAggregate._sum.totalAmount || 0),
        monthlySales: Number(monthlySalesAggregate._sum.totalAmount || 0),
        totalCalls,
        callsToday,
        pendingApprovals,
        lowStockAlerts,
      },
      sourceDistribution,
      salesTeamPerformance,
      recentOrders: recentOrders.map((ord) => ({
        id: ord.id,
        orderNumber: ord.orderNumber,
        customerName: ord.customer?.fullName || 'Customer',
        customerPhone: ord.customer?.phoneNumber,
        customerLocation: [ord.customer?.city, ord.customer?.state].filter(Boolean).join(', '),
        itemCount: ord.items.length,
        primaryItem: ord.items[0]?.product?.name || 'Ayurvedic Medicine',
        totalAmount: Number(ord.totalAmount),
        paymentMode: ord.paymentMode,
        status: ord.status,
        createdAt: ord.createdAt,
      })),
      recentActivityFeed: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.user ? `${log.user.employeeCode} (${log.user.firstName})` : 'System',
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Panel 02: Salesperson Dashboard
   * MANDATORY INVARIANT: STRICT ZERO LEAD SOURCE DATA.
   * Under no circumstances may source name, campaign ID, ad ID, or spend be exposed here.
   */
  async getSalesDashboard(salespersonId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: salespersonId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new NotFoundException('Salesperson not found');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalAssigned,
      newLeads,
      contactedLeads,
      followUpRequiredLeads,
      pendingReviewLeads,
      approvedLeads,
      convertedLeads,
      rejectedLeads,
      callsLoggedToday,
      totalCallsLogged,
      followUpsScheduledToday,
      pendingFollowUps,
      overdueFollowUps,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { assignedToId: salespersonId } }),
      this.prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: { in: [LeadStatus.NEW, LeadStatus.ASSIGNED] },
        },
      }),
      this.prisma.lead.count({
        where: { assignedToId: salespersonId, status: LeadStatus.CONTACTED },
      }),
      this.prisma.lead.count({
        where: { assignedToId: salespersonId, status: LeadStatus.FOLLOW_UP_REQUIRED },
      }),
      this.prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: { in: [LeadStatus.PENDING_REVIEW, LeadStatus.UNDER_REVIEW] },
        },
      }),
      this.prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: { in: [LeadStatus.APPROVAL_REQUESTED, LeadStatus.APPROVED] },
        },
      }),
      this.prisma.lead.count({
        where: { assignedToId: salespersonId, status: LeadStatus.CONVERTED },
      }),
      this.prisma.lead.count({
        where: { assignedToId: salespersonId, status: LeadStatus.REJECTED },
      }),
      this.prisma.callLog.count({
        where: {
          callerId: salespersonId,
          calledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.callLog.count({
        where: { callerId: salespersonId },
      }),
      this.prisma.followUp.count({
        where: {
          assignedToId: salespersonId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.followUp.count({
        where: {
          assignedToId: salespersonId,
          status: FollowUpStatus.SCHEDULED,
          scheduledTime: { lte: todayEnd },
        },
      }),
      this.prisma.followUp.count({
        where: {
          assignedToId: salespersonId,
          status: { in: [FollowUpStatus.SCHEDULED, FollowUpStatus.OVERDUE] },
          scheduledTime: { lt: todayStart },
        },
      }),
    ]);

    const conversionRate =
      totalAssigned > 0 ? Number(((convertedLeads / totalAssigned) * 100).toFixed(1)) : 0;

    return {
      salesperson: {
        id: user.id,
        employeeCode: user.employeeCode,
        name: `${user.firstName} ${user.lastName}`,
      },
      pipeline: {
        totalAssigned,
        newLeads,
        contactedLeads,
        followUpRequiredLeads,
        pendingReviewLeads,
        approvedLeads,
        convertedLeads,
        rejectedLeads,
        conversionRate,
      },
      todayActivity: {
        callsLoggedToday,
        followUpsScheduledToday,
        pendingFollowUpsToday: pendingFollowUps,
        overdueFollowUps,
      },
      performance: {
        totalCallsLogged,
        conversionRate,
      },
    };
  }

  /**
   * Panel 03: Pending Review Dashboard
   */
  async getPendingReviewDashboard(userId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalPendingQueue,
      inReviewQueue,
      overdueReviewsCount,
      decidedToday,
      approvedToday,
      rejectedToday,
      followUpRequestedToday,
      sendBackToday,
      urgentPendingCount,
      highPendingCount,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { status: LeadStatus.PENDING_REVIEW },
      }),
      this.prisma.lead.count({
        where: { status: LeadStatus.UNDER_REVIEW },
      }),
      this.prisma.pendingReview.count({
        where: {
          decision: null,
          createdAt: { lt: twentyFourHoursAgo },
        },
      }),
      this.prisma.pendingReview.count({
        where: {
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.pendingReview.count({
        where: {
          decision: 'APPROVE',
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.pendingReview.count({
        where: {
          decision: 'REJECT',
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.pendingReview.count({
        where: {
          decision: 'REQUEST_FOLLOW_UP',
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.pendingReview.count({
        where: {
          decision: 'SEND_BACK',
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.lead.count({
        where: {
          status: { in: [LeadStatus.PENDING_REVIEW, LeadStatus.UNDER_REVIEW] },
          priority: 'URGENT',
        },
      }),
      this.prisma.lead.count({
        where: {
          status: { in: [LeadStatus.PENDING_REVIEW, LeadStatus.UNDER_REVIEW] },
          priority: 'HIGH',
        },
      }),
    ]);

    return {
      queue: {
        totalPendingInQueue: totalPendingQueue,
        underReviewCount: inReviewQueue,
        totalOpenWorkload: totalPendingQueue + inReviewQueue,
        overdueReviewsCount, // > 24 hours SLA
        slaBreachRiskCount: urgentPendingCount + overdueReviewsCount,
      },
      todayActivity: {
        totalDecidedToday: decidedToday,
        approvedToday,
        rejectedToday,
        followUpRequestedToday,
        sendBackToday,
        approvalRateToday:
          decidedToday > 0 ? Number(((approvedToday / decidedToday) * 100).toFixed(1)) : 0,
      },
      priorityBreakdown: {
        urgent: urgentPendingCount,
        high: highPendingCount,
        normal: Math.max(0, totalPendingQueue + inReviewQueue - urgentPendingCount - highPendingCount),
      },
    };
  }

  /**
   * Panel 04: Approval Authority Dashboard
   */
  async getApprovalDashboard(userId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalPendingApproval,
      decidedToday,
      approvedToday,
      rejectedToday,
      sendBackToday,
      topDiseaseCategories,
      orderValueApproved,
    ] = await Promise.all([
      this.prisma.approvalRequest.count({
        where: { decision: null },
      }),
      this.prisma.approvalRequest.count({
        where: { decidedAt: { gte: todayStart } },
      }),
      this.prisma.approvalRequest.count({
        where: {
          decision: 'APPROVE',
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.approvalRequest.count({
        where: {
          decision: 'REJECT',
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.approvalRequest.count({
        where: {
          decision: 'SEND_BACK',
          decidedAt: { gte: todayStart },
        },
      }),
      this.prisma.productCategory.findMany({
        take: 5,
        include: {
          _count: { select: { products: true } },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] } },
      }),
    ]);

    return {
      queue: {
        totalPendingApproval,
      },
      todayActivity: {
        totalDecidedToday: decidedToday,
        approvedToday,
        rejectedToday,
        sendBackToday,
        approvalRate:
          decidedToday > 0 ? Number(((approvedToday / decidedToday) * 100).toFixed(1)) : 0,
      },
      commercialImpact: {
        totalApprovedOrderValue: Number(orderValueApproved._sum.totalAmount || 0),
      },
      diseaseCategories: topDiseaseCategories.map((c: any) => ({
        id: c.id,
        name: c.name,
        productsCount: c._count.products,
      })),
    };
  }

  /**
   * Panel 05: Management Dashboard
   */
  async getManagementDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      newCustomersThisMonth,
      totalOrders,
      draftOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      revenueAggregate,
      deliveredRevenueAggregate,
      invoiceTaxAggregates,
      lowStockInventory,
      topProducts,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.DRAFT } }),
      this.prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.order.count({ where: { status: OrderStatus.RETURNED } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: OrderStatus.CANCELLED } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: OrderStatus.DELIVERED },
      }),
      this.prisma.invoice.aggregate({
        _sum: {
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          totalTax: true,
          grandTotal: true,
        },
      }),
      this.prisma.inventory.findMany({
        include: { product: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const lowStockAlerts = lowStockInventory
      .filter((inv) => inv.availableQuantity <= inv.lowStockThreshold)
      .map((inv) => ({
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.product.sku,
        availableQuantity: inv.availableQuantity,
        reservedQuantity: inv.reservedQuantity,
        lowStockThreshold: inv.lowStockThreshold,
      }));

    const fulfilledOrdersCount = deliveredOrders;
    const attemptedOrdersCount = deliveredOrders + returnedOrders + cancelledOrders;
    const deliverySuccessRate =
      attemptedOrdersCount > 0
        ? Number(((fulfilledOrdersCount / attemptedOrdersCount) * 100).toFixed(1))
        : 100;

    // Attach product names to top sold items
    const topSellingProducts = await Promise.all(
      topProducts.map(async (item) => {
        const prod = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, sku: true },
        });
        return {
          productId: item.productId,
          productName: prod?.name || 'Unknown',
          sku: prod?.sku || 'N/A',
          unitsSold: item._sum.quantity || 0,
          revenue: Number(item._sum.totalPrice || 0),
        };
      }),
    );

    return {
      customers: {
        totalCustomers,
        newCustomersThisMonth,
      },
      orders: {
        totalOrders,
        draftOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        deliverySuccessRate,
      },
      financials: {
        grossRevenue: Number(revenueAggregate._sum.totalAmount || 0),
        deliveredRevenue: Number(deliveredRevenueAggregate._sum.totalAmount || 0),
        totalTaxCollected: Number(invoiceTaxAggregates._sum.totalTax || 0),
        cgstCollected: Number(invoiceTaxAggregates._sum.cgstAmount || 0),
        sgstCollected: Number(invoiceTaxAggregates._sum.sgstAmount || 0),
        igstCollected: Number(invoiceTaxAggregates._sum.igstAmount || 0),
        invoicedGrandTotal: Number(invoiceTaxAggregates._sum.grandTotal || 0),
      },
      inventoryHealth: {
        totalSkusTracked: lowStockInventory.length,
        lowStockCount: lowStockAlerts.length,
        lowStockAlerts,
      },
      topSellingProducts,
    };
  }

  /**
   * Helper to parse date/month boundaries for staff activity aggregation
   */
  private parseDateRange(mode?: 'daily' | 'monthly', dateStr?: string, monthStr?: string) {
    const now = new Date();
    if (mode === 'monthly') {
      let year = now.getFullYear();
      let month = now.getMonth(); // 0-indexed
      if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
        const parts = monthStr.split('-').map(Number);
        year = parts[0];
        month = parts[1] - 1;
      }
      const startDate = new Date(year, month, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const monthLabel = startDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      return {
        mode: 'monthly',
        startDate,
        endDate,
        label: monthLabel,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}`,
        monthStart: startDate,
        monthEnd: endDate,
      };
    } else {
      let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('-').map(Number);
        targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
      }
      const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
      const isToday =
        startDate.getDate() === now.getDate() &&
        startDate.getMonth() === now.getMonth() &&
        startDate.getFullYear() === now.getFullYear();
      const dateLabel = isToday
        ? `Today, ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      // Month bounds for MTD calculations
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

      return {
        mode: 'daily',
        startDate,
        endDate,
        label: dateLabel,
        dateStr: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
        monthStart,
        monthEnd,
      };
    }
  }

  /**
   * Panel 01: Super Admin Staff Daily & Monthly Activity, Performance & Incentive Ledger
   */
  async getStaffDailyActivity(query: {
    mode?: 'daily' | 'monthly';
    date?: string;
    month?: string;
    role?: RoleType;
  }) {
    const range = this.parseDateRange(query.mode, query.date, query.month);
    const { startDate, endDate, monthStart, monthEnd, mode, label, dateStr } = range;

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(query.role ? { role: query.role } : {}),
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { employeeCode: 'asc' },
      ],
    });

    let totalCalls = 0;
    let totalCallDurationSeconds = 0;
    let totalOrdersCreated = 0;
    let totalRevenueRealized = 0;
    let totalInvoicesIssued = 0;
    let totalIncentivePool = 0;

    let topPerformer = {
      employeeCode: '',
      name: '',
      revenue: 0,
      orders: 0,
    };

    const staff = await Promise.all(
      users.map(async (u) => {
        // 1. Leads assigned in period
        const leadsAssigned = await this.prisma.lead.count({
          where: {
            assignedToId: u.id,
            OR: [
              { assignedAt: { gte: startDate, lte: endDate } },
              { createdAt: { gte: startDate, lte: endDate } },
            ],
          },
        });

        // 2. Calls logged in period
        const [callsCount, callsDurationAgg, callOutcomesRaw] = await Promise.all([
          this.prisma.callLog.count({
            where: { callerId: u.id, calledAt: { gte: startDate, lte: endDate } },
          }),
          this.prisma.callLog.aggregate({
            where: { callerId: u.id, calledAt: { gte: startDate, lte: endDate } },
            _sum: { durationSeconds: true },
          }),
          this.prisma.callLog.groupBy({
            by: ['callOutcome'],
            where: { callerId: u.id, calledAt: { gte: startDate, lte: endDate } },
            _count: true,
          }),
        ]);

        const callDurationSeconds = callsDurationAgg._sum.durationSeconds || 0;
        const callOutcomes = callOutcomesRaw.reduce((acc, curr) => {
          acc[curr.callOutcome] = curr._count;
          return acc;
        }, {} as Record<string, number>);

        // 3. Orders booked in period
        const [ordersCount, ordersRevenueAgg] = await Promise.all([
          this.prisma.order.count({
            where: {
              createdById: u.id,
              createdAt: { gte: startDate, lte: endDate },
              status: { notIn: [OrderStatus.CANCELLED] },
            },
          }),
          this.prisma.order.aggregate({
            where: {
              createdById: u.id,
              createdAt: { gte: startDate, lte: endDate },
              status: { notIn: [OrderStatus.CANCELLED] },
            },
            _sum: { totalAmount: true },
          }),
        ]);

        const revenueRealized = Number(ordersRevenueAgg._sum.totalAmount || 0);

        // 4. MTD numbers for Quota calculation
        const mStart = mode === 'monthly' ? startDate : monthStart;
        const mEnd = mode === 'monthly' ? endDate : monthEnd;

        const [mtdOrdersCount, mtdRevenueAgg, mtdCallsCount] = await Promise.all([
          this.prisma.order.count({
            where: {
              createdById: u.id,
              createdAt: { gte: mStart, lte: mEnd },
              status: { notIn: [OrderStatus.CANCELLED] },
            },
          }),
          this.prisma.order.aggregate({
            where: {
              createdById: u.id,
              createdAt: { gte: mStart, lte: mEnd },
              status: { notIn: [OrderStatus.CANCELLED] },
            },
            _sum: { totalAmount: true },
          }),
          this.prisma.callLog.count({
            where: { callerId: u.id, calledAt: { gte: mStart, lte: mEnd } },
          }),
        ]);

        const monthlyAchieved = Number(mtdRevenueAgg._sum.totalAmount || 0);
        const monthlyTarget = 100000; // Baseline ₹1,00,000 monthly quota
        const monthlyQuotaPercentage =
          monthlyTarget > 0 ? Number(((monthlyAchieved / monthlyTarget) * 100).toFixed(1)) : 0;

        // 5. Role-specific output
        let approvalsCount = 0;
        let reviewsCount = 0;
        let invoicesCount = 0;
        let followupsCount = 0;

        if (u.role === RoleType.APPROVAL_OFFICER) {
          approvalsCount = await this.prisma.approvalRequest.count({
            where: { officerId: u.id, updatedAt: { gte: startDate, lte: endDate } },
          });
        } else if (u.role === RoleType.PENDING_REVIEWER) {
          reviewsCount = await this.prisma.pendingReview.count({
            where: { claimedById: u.id, updatedAt: { gte: startDate, lte: endDate } },
          });
        } else if (u.role === RoleType.BILLING_EXECUTIVE) {
          invoicesCount = await this.prisma.auditLog.count({
            where: {
              userId: u.id,
              action: 'INVOICE_GENERATED',
              createdAt: { gte: startDate, lte: endDate },
            },
          });
        } else if (u.role === RoleType.FOLLOWUP_EXECUTIVE) {
          followupsCount = await this.prisma.customerFollowUpLog.count({
            where: { callerId: u.id, createdAt: { gte: startDate, lte: endDate } },
          });
        }

        // 6. Incentive Calculation Engine
        // Base commission on period sales (3%)
        let baseIncentive = 0;
        let milestoneBonus = 0;
        let activityBonus = 0;

        if (u.role === RoleType.SALESPERSON || u.role === RoleType.SUPER_ADMIN) {
          baseIncentive = Math.round(revenueRealized * 0.03);

          // Milestone bonus based on MTD revenue
          if (monthlyAchieved >= 200000) {
            milestoneBonus = 10000;
          } else if (monthlyAchieved >= 100000) {
            milestoneBonus = 4000;
          } else if (monthlyAchieved >= 50000) {
            milestoneBonus = 1500;
          }

          // Daily call volume bonus
          if (mode === 'daily' && callsCount >= 35) {
            activityBonus += 150;
          } else if (mode === 'monthly' && mtdCallsCount >= 600) {
            activityBonus += 2500;
          }
        } else if (u.role === RoleType.APPROVAL_OFFICER) {
          // ₹25 per formulation review sign-off
          baseIncentive = approvalsCount * 25;
        } else if (u.role === RoleType.BILLING_EXECUTIVE) {
          // ₹15 per invoice released
          baseIncentive = invoicesCount * 15;
        } else if (u.role === RoleType.FOLLOWUP_EXECUTIVE) {
          // ₹40 per completed care follow-up
          baseIncentive = followupsCount * 40;
        }

        const totalIncentive = baseIncentive + milestoneBonus + activityBonus;

        // Conversion rate
        const conversionRate =
          leadsAssigned > 0 ? Number(((ordersCount / leadsAssigned) * 100).toFixed(1)) : 0;

        // Team aggregates
        totalCalls += callsCount;
        totalCallDurationSeconds += callDurationSeconds;
        totalOrdersCreated += ordersCount;
        totalRevenueRealized += revenueRealized;
        totalInvoicesIssued += invoicesCount;
        totalIncentivePool += totalIncentive;

        if (revenueRealized > topPerformer.revenue) {
          topPerformer = {
            employeeCode: u.employeeCode,
            name: `${u.firstName} ${u.lastName}`,
            revenue: revenueRealized,
            orders: ordersCount,
          };
        }

        return {
          id: u.id,
          employeeCode: u.employeeCode,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
          isActive: u.isActive,
          phoneNumber: u.phoneNumber,
          email: u.email,
          leadsAssigned,
          callsCount,
          callDurationSeconds,
          callOutcomes,
          ordersCount,
          revenueRealized,
          conversionRate,
          monthlyTarget,
          monthlyAchieved,
          monthlyQuotaPercentage,
          approvalsCount,
          reviewsCount,
          invoicesCount,
          followupsCount,
          baseIncentive,
          milestoneBonus,
          activityBonus,
          totalIncentive,
        };
      }),
    );

    return {
      timeframe: {
        mode,
        label,
        date: dateStr,
        startDate,
        endDate,
      },
      summaryKpis: {
        totalActiveStaff: users.length,
        totalCalls,
        totalCallDurationSeconds,
        totalOrdersCreated,
        totalRevenueRealized,
        totalInvoicesIssued,
        totalIncentivePool,
        topPerformer: topPerformer.revenue > 0 ? topPerformer : null,
      },
      staff,
    };
  }

  /**
   * Panel 01: Drill-down chronological day log for a specific staff member
   */
  async getStaffDayLog(userId: string, dateStr?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Employee with ID ${userId} not found`);
    }

    const range = this.parseDateRange('daily', dateStr);
    const { startDate, endDate, dateStr: normalizedDate, label } = range;

    // Calls on this day
    const calls = await this.prisma.callLog.findMany({
      where: { callerId: userId, calledAt: { gte: startDate, lte: endDate } },
      include: {
        lead: {
          select: {
            id: true,
            leadCode: true,
            customerName: true,
            phoneNumber: true,
            city: true,
            state: true,
            productInterest: true,
            status: true,
          },
        },
      },
      orderBy: { calledAt: 'desc' },
    });

    // Leads assigned on this day
    const leads = await this.prisma.lead.findMany({
      where: {
        assignedToId: userId,
        OR: [
          { assignedAt: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } },
        ],
      },
      select: {
        id: true,
        leadCode: true,
        customerName: true,
        phoneNumber: true,
        productInterest: true,
        priority: true,
        status: true,
        sourceType: true,
        createdAt: true,
        assignedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Orders created on this day
    const orders = await this.prisma.order.findMany({
      where: {
        createdById: userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { fullName: true, phoneNumber: true, city: true, state: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Audit logs on this day
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        ipAddress: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      user,
      date: normalizedDate,
      label,
      calls,
      leads,
      orders,
      auditLogs,
    };
  }
}
