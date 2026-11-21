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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Lead metrics
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
      orderAggregates,
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
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: OrderStatus.CANCELLED } },
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
        grossSalesRevenue: Number(orderAggregates._sum.totalAmount || 0),
        lowStockAlerts,
      },
      sourceDistribution,
      salesTeamPerformance,
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
}
