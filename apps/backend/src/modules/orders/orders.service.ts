import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDraftOrderDto } from './dto/create-draft-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InventoryTxType, OrderStatus, PaymentMode, PaymentStatus, LeadStatus, RoleType, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generates sequential order identifier: MEL-ORD-YYYY-XXXXX
   */
  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MEL-ORD-${year}-`;
    const existing = await this.prisma.order.findMany({
      where: { orderNumber: { startsWith: prefix } },
      select: { orderNumber: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let maxNumber = 100; // Baseline start
    for (const o of existing) {
      const numPart = o.orderNumber.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  /**
   * Create a draft order for a verified customer
   */
  async createDraftOrder(dto: CreateDraftOrderDto, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one formulation item');
    }

    // Fetch and validate all products
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more selected products are invalid or inactive');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate line items, subtotal, and tax
    let subtotal = 0;
    let taxAmount = 0;
    const orderItemsData: any[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.sellingPrice);
      const totalPrice = unitPrice * item.quantity;
      const gstRate = Number(product.gstRate) || 12.0;
      const itemTax = (totalPrice * gstRate) / 100;

      subtotal += totalPrice;
      taxAmount += itemTax;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    const discountAmount = dto.discountAmount ? Number(dto.discountAmount) : 0;
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
    const orderNumber = await this.generateOrderNumber();

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          createdById: user.id,
          status: OrderStatus.DRAFT,
          subtotal: Number(subtotal.toFixed(2)),
          discountAmount: Number(discountAmount.toFixed(2)),
          taxAmount: Number(taxAmount.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          paymentMode: dto.paymentMode || PaymentMode.CASH_ON_DELIVERY,
          paymentStatus: PaymentStatus.PENDING,
          notes: dto.notes?.trim(),
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, sellingPrice: true },
              },
            },
          },
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
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ORDER_DRAFT_CREATED',
          entityType: 'Order',
          entityId: order.id,
          newState: {
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            customerCode: customer.customerCode,
            createdBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Draft order created: ${order.orderNumber} for customer ${customer.customerCode}. Total: ₹${order.totalAmount}`,
      );

      return order;
    });

    // Dispatch real-time live notification for new draft formulation order
    try {
      await this.notificationsService.dispatchToRole(
        [RoleType.MANAGEMENT, RoleType.SUPER_ADMIN],
        {
          title: 'New Formulation Order Drafted',
          message: `Order ${createdOrder.orderNumber} created for ${customer.fullName || customer.customerCode}. Total: ₹${createdOrder.totalAmount.toFixed(2)}.`,
          type: NotificationType.INFO,
          link: '/management/orders',
        },
      );
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch order draft notification: ${notifErr}`);
    }

    return createdOrder;
  }

  /**
   * Finalize and confirm order with atomic inventory reservation
   */
  async confirmOrder(orderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT orders can be confirmed. Current order status: ${order.status}`,
      );
    }

    const confirmedOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Verify and atomically reserve inventory for each item
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory || inventory.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient inventory for ${item.product.name} (SKU: ${item.product.sku}). Available: ${inventory?.availableQuantity || 0}, Required: ${item.quantity}`,
          );
        }

        const newAvailable = inventory.availableQuantity - item.quantity;
        const newReserved = inventory.reservedQuantity + item.quantity;

        // Decrement available, increment reserved
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            availableQuantity: newAvailable,
            reservedQuantity: newReserved,
          },
        });

        // Record inventory ledger transaction
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            type: InventoryTxType.ORDER_RESERVATION,
            quantity: item.quantity,
            balanceAfter: newAvailable,
            notes: `Atomic reservation for Order ${order.orderNumber}`,
          },
        });
      }

      // 2. Update order status to CONFIRMED
      const confirmedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CONFIRMED,
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, sku: true, name: true },
              },
            },
          },
          customer: true,
        },
      });

      // 3. Automatically transition associated Lead to CONVERTED
      let associatedLead = null;
      if (order.customer.convertedFromId) {
        associatedLead = await tx.lead.findUnique({
          where: { id: order.customer.convertedFromId },
        });
      } else if (order.customer.phoneNumber) {
        associatedLead = await tx.lead.findFirst({
          where: { phoneNumber: order.customer.phoneNumber },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (associatedLead && associatedLead.status !== LeadStatus.CONVERTED) {
        await tx.lead.update({
          where: { id: associatedLead.id },
          data: { status: LeadStatus.CONVERTED },
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: associatedLead.id,
            fromStatus: associatedLead.status,
            toStatus: LeadStatus.CONVERTED,
            changedById: user.id,
            reason: `Order ${order.orderNumber} confirmed by ${user.employeeCode} (${user.role})`,
          },
        });

        if (!order.customer.convertedFromId) {
          await tx.customer.update({
            where: { id: order.customerId },
            data: { convertedFromId: associatedLead.id },
          });
        }
      }

      // 4. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ORDER_CONFIRMED',
          entityType: 'Order',
          entityId: order.id,
          newState: {
            orderNumber: order.orderNumber,
            status: OrderStatus.CONFIRMED,
            confirmedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Order ${order.orderNumber} confirmed by ${user.employeeCode}. Inventory atomically reserved.`,
      );

      return confirmedOrder;
    });

    // Dispatch real-time live notifications for confirmed order
    try {
      // 1. Notify Super Admin and Management
      await this.notificationsService.dispatchToRole(
        [RoleType.SUPER_ADMIN],
        {
          title: 'Order Confirmed & Inventory Reserved',
          message: `Order ${order.orderNumber} confirmed for ${order.customer.fullName || order.customer.customerCode}! Total: ₹${order.totalAmount.toFixed(2)}.`,
          type: NotificationType.ORDER_CONFIRMED,
          link: '/admin/orders',
        },
      );

      // 2. Notify Management / Warehouse for Courier Dispatch
      await this.notificationsService.dispatchToRole(
        [RoleType.MANAGEMENT],
        {
          title: 'Order Confirmed: Ready for Courier Dispatch',
          message: `Order ${order.orderNumber} for ${order.customer.fullName || order.customer.customerCode} is confirmed and waiting for courier dispatch.`,
          type: NotificationType.ORDER_CONFIRMED,
          link: '/management/dispatch',
        },
      );

      // 2. Notify assigned salesperson if associated lead exists
      if (order.customer.convertedFromId) {
        const associatedLead = await this.prisma.lead.findUnique({
          where: { id: order.customer.convertedFromId },
          select: { assignedToId: true, leadCode: true },
        });
        if (associatedLead?.assignedToId) {
          await this.notificationsService.createNotification({
            userId: associatedLead.assignedToId,
            title: 'Commercial Conversion Confirmed!',
            message: `Congratulations! Order ${order.orderNumber} for your lead was confirmed (₹${order.totalAmount.toFixed(2)})!`,
            type: NotificationType.SUCCESS,
            link: '/sales',
          });
        }
      }
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch order confirmation notifications: ${notifErr}`);
    }

    return confirmedOrder;
  }

  /**
   * Retrieves paginated list of orders
   */
  async findAll(query: OrderQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { customer: { fullName: { contains: s, mode: 'insensitive' } } },
        { customer: { customerCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
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
                select: { id: true, sku: true, name: true },
              },
            },
          },
          createdBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          invoice: {
            select: { id: true, invoiceNumber: true, grandTotal: true },
          },
          shipment: {
            select: { id: true, trackingAwb: true, courierPartner: true, status: true },
          },
        },
      }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single order by ID with items, invoice, and shipment
   */
  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
                inventory: true,
              },
            },
          },
        },
        createdBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        invoice: true,
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Cancel an order and release reserved stock if confirmed
   */
  async cancelOrder(
    orderId: string,
    reason: string | undefined,
    user: AuthenticatedUser,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If confirmed, release reserved stock back to available
      if (order.status === OrderStatus.CONFIRMED) {
        for (const item of order.items) {
          const inv = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });

          if (inv) {
            const newAvailable = inv.availableQuantity + item.quantity;
            const newReserved = Math.max(0, inv.reservedQuantity - item.quantity);

            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                availableQuantity: newAvailable,
                reservedQuantity: newReserved,
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                type: InventoryTxType.ORDER_CANCELLED,
                quantity: item.quantity,
                balanceAfter: newAvailable,
                notes: `Stock released upon cancellation of Order ${order.orderNumber}`,
              },
            });
          }
        }
      }

      const cancelledOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          notes: reason
            ? `${order.notes || ''} [Cancelled: ${reason}]`.trim()
            : order.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ORDER_CANCELLED',
          entityType: 'Order',
          entityId: order.id,
          newState: {
            orderNumber: order.orderNumber,
            reason,
            cancelledBy: user.employeeCode,
          },
        },
      });

      return cancelledOrder;
    });
  }

  /**
   * Order Metrics for Management Dashboard
   */
  async getMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalOrders, confirmedCount, draftCount, todaySales] =
      await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
        this.prisma.order.count({ where: { status: OrderStatus.DRAFT } }),
        this.prisma.order.aggregate({
          where: {
            status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
            createdAt: { gte: startOfToday },
          },
          _sum: { totalAmount: true },
        }),
      ]);

    return {
      totalOrders,
      confirmedCount,
      draftCount,
      todayRevenue: Number(todaySales._sum.totalAmount || 0),
    };
  }
}
