import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDraftOrderDto } from './dto/create-draft-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DecideOrderDto } from './dto/decide-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { InventoryTxType, OrderStatus, PaymentMode, PaymentStatus, LeadStatus, LeadPriority, RoleType, NotificationType } from '@prisma/client';
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
      orderBy: { orderNumber: 'desc' },
      take: 50,
    });

    let maxNumber = 100; // Baseline start
    for (const o of existing) {
      const numPart = o.orderNumber.replace(prefix, '').trim();
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }

    let nextNumber = maxNumber + 1;
    let candidate = `${prefix}${String(nextNumber).padStart(5, '0')}`;

    // Safety verification: ensure candidate order token does not exist in database
    let duplicateCheck = await this.prisma.order.findUnique({
      where: { orderNumber: candidate },
    });
    while (duplicateCheck) {
      nextNumber += 1;
      candidate = `${prefix}${String(nextNumber).padStart(5, '0')}`;
      duplicateCheck = await this.prisma.order.findUnique({
        where: { orderNumber: candidate },
      });
    }

    return candidate;
  }

  /**
   * Create a draft order for a verified customer or lead
   */
  async createDraftOrder(dto: CreateDraftOrderDto, user: AuthenticatedUser) {
    let customer: any = null;

    if (dto.customerId) {
      customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
    }

    if (!customer && (dto.phoneNumber || dto.leadId)) {
      const phoneDigits = dto.phoneNumber
        ? dto.phoneNumber.replace(/\D/g, '').slice(-10)
        : null;

      if (phoneDigits) {
        customer = await this.prisma.customer.findFirst({
          where: {
            OR: [
              { phoneNumber: dto.phoneNumber },
              { phoneNumber: phoneDigits },
              { phoneNumber: `+91${phoneDigits}` },
            ],
          },
        });
      }

      if (!customer && dto.leadId) {
        const lead = await this.prisma.lead.findUnique({
          where: { id: dto.leadId },
        });
        if (lead) {
          const leadDigits = lead.phoneNumber.replace(/\D/g, '').slice(-10);
          customer = await this.prisma.customer.findFirst({
            where: {
              OR: [
                { phoneNumber: lead.phoneNumber },
                { phoneNumber: leadDigits },
                { phoneNumber: `+91${leadDigits}` },
              ],
            },
          });

          if (!customer) {
            const count = await this.prisma.customer.count();
            const customerCode = `MEL-CUST-${String(count + 1).padStart(5, '0')}`;
            customer = await this.prisma.customer.create({
              data: {
                customerCode,
                fullName: dto.customerName?.trim() || lead.customerName,
                phoneNumber: lead.phoneNumber,
                alternatePhone: dto.alternatePhone?.trim() || lead.alternatePhone,
                address: dto.shippingAddress?.trim() || lead.address,
                city: dto.city?.trim() || lead.city,
                state: dto.state?.trim() || lead.state,
                pincode: dto.pincode?.trim(),
                convertedFromId: lead.id,
              },
            });
          }
        }
      } else if (!customer && dto.customerName && dto.phoneNumber) {
        const phoneDigits = dto.phoneNumber.replace(/\D/g, '').slice(-10);
        customer = await this.prisma.customer.findFirst({
          where: {
            OR: [
              { phoneNumber: dto.phoneNumber.trim() },
              { phoneNumber: phoneDigits },
              { phoneNumber: `+91${phoneDigits}` },
            ],
          },
        });

        if (!customer) {
          const count = await this.prisma.customer.count();
          const timestamp = Date.now().toString().slice(-4);
          const customerCode = `MEL-CUST-${String(count + 1).padStart(4, '0')}-${timestamp}`;
          try {
            customer = await this.prisma.customer.create({
              data: {
                customerCode,
                fullName: dto.customerName.trim(),
                phoneNumber: phoneDigits || dto.phoneNumber.trim(),
                alternatePhone: dto.alternatePhone?.trim(),
                address: dto.shippingAddress?.trim(),
                city: dto.city?.trim() || 'Gujarat',
                state: dto.state?.trim() || 'Gujarat',
                pincode: dto.pincode?.trim(),
              },
            });
          } catch (createErr) {
            // If duplicate phone or customerCode happened concurrently, fetch existing
            customer = await this.prisma.customer.findFirst({
              where: {
                OR: [
                  { phoneNumber: dto.phoneNumber.trim() },
                  { phoneNumber: phoneDigits },
                ],
              },
            });
            if (!customer) throw createErr;
          }
        }
      }
    }

    if (!customer) {
      throw new NotFoundException('Customer could not be found or created. Please provide valid customer details or lead ID.');
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
      // Allow custom negotiated unitPrice entered by salesperson to close deals
      const unitPrice =
        item.unitPrice !== undefined && item.unitPrice !== null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) >= 0
          ? Number(item.unitPrice)
          : Number(product.sellingPrice);
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
                select: { id: true, sku: true, name: true, sellingPrice: true, mrpPrice: true, targetDisease: true },
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

      // If associated with a Lead, update status to CONVERTED or PENDING_REVIEW
      if (dto.leadId) {
        await tx.lead.update({
          where: { id: dto.leadId },
          data: { status: LeadStatus.CONVERTED },
        }).catch(() => null);

        await tx.leadStatusHistory.create({
          data: {
            leadId: dto.leadId,
            fromStatus: LeadStatus.INTERESTED,
            toStatus: LeadStatus.CONVERTED,
            changedById: user.id,
            reason: `Order ${orderNumber} created with negotiated deal by ${user.employeeCode}`,
          },
        }).catch(() => null);
      }

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
            negotiatedDiscount: discountAmount,
            itemCount: dto.items.length,
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
                select: { id: true, sku: true, name: true, mrpPrice: true, sellingPrice: true, targetDisease: true },
              },
            },
          },
          customer: true,
        },
      });

      // 3. Automatically transition associated Lead to CONVERTED
      let associatedLead = null;
      if (order.customer?.convertedFromId) {
        associatedLead = await tx.lead.findUnique({
          where: { id: order.customer.convertedFromId },
        });
      } else if (order.customer?.phoneNumber) {
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
  async findAll(query: OrderQueryDto, user?: AuthenticatedUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based scoping: Salesperson only views their own booked orders
    if (user?.role === RoleType.SALESPERSON) {
      where.createdById = user.id;
    } else if (query.createdById) {
      where.createdById = query.createdById;
    }

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
        { customer: { phoneNumber: { contains: s } } },
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
                select: { id: true, sku: true, name: true, mrpPrice: true, sellingPrice: true, targetDisease: true },
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
   * Order Metrics for Management & Super Admin Dashboards
   */
  async getMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalOrders,
      draftOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      totalRevenueAgg,
      todayRevenueAgg,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.DRAFT } }),
      this.prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.order.count({ where: { status: OrderStatus.RETURNED } }),
      this.prisma.order.aggregate({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          createdAt: { gte: startOfToday },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalRevenue = Number(totalRevenueAgg._sum.totalAmount || 0);
    const todayRevenue = Number(todayRevenueAgg._sum.totalAmount || 0);

    return {
      totalOrders,
      draftOrders,
      draftCount: draftOrders,
      confirmedOrders,
      confirmedCount: confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      totalRevenue,
      todayRevenue,
    };
  }

  /**
   * Retrieve active formulation order linked to a lead or customer
   */
  async findByLeadId(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!lead) return null;

    const phoneDigits = lead.phoneNumber.replace(/\D/g, '').slice(-10);

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { customer: { convertedFromId: leadId } },
          { customer: { phoneNumber: lead.phoneNumber } },
          { customer: { phoneNumber: phoneDigits } },
          { customer: { phoneNumber: `+91${phoneDigits}` } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, mrpPrice: true, sellingPrice: true, targetDisease: true },
            },
          },
        },
        customer: true,
        createdBy: { select: { id: true, employeeCode: true, firstName: true, lastName: true, role: true } },
      },
    });

    return order;
  }

  /**
   * Update order attributes, items, quantities, pricing, and capture approver remarks
   */
  async updateOrder(orderId: string, dto: UpdateOrderDto, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        customer: true,
        createdBy: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Role check: Salesperson can only edit their own DRAFT orders
    if (user.role === RoleType.SALESPERSON && order.createdById !== user.id) {
      throw new ForbiddenException('You can only edit orders created by your desk');
    }

    // Cannot edit cancelled or dispatched orders unless Super Admin
    if (order.status === OrderStatus.CANCELLED && user.role !== RoleType.SUPER_ADMIN) {
      throw new BadRequestException('Cannot edit a CANCELLED order');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. If customer info or address updated
      if (
        dto.customerName ||
        dto.phoneNumber ||
        dto.shippingAddress ||
        dto.city ||
        dto.state ||
        dto.pincode ||
        dto.alternatePhone
      ) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            fullName: dto.customerName?.trim() || undefined,
            phoneNumber: dto.phoneNumber?.trim() || undefined,
            alternatePhone: dto.alternatePhone?.trim() || undefined,
            address: dto.shippingAddress?.trim() || undefined,
            city: dto.city?.trim() || undefined,
            state: dto.state?.trim() || undefined,
            pincode: dto.pincode?.trim() || undefined,
          },
        });
      }

      // 2. If items updated, recalculate financial totals
      let subtotal = Number(order.subtotal);
      let taxAmount = Number(order.taxAmount);
      let discountAmount = dto.discountAmount !== undefined ? dto.discountAmount : Number(order.discountAmount);
      let totalAmount = Number(order.totalAmount);

      if (dto.items && dto.items.length > 0) {
        // Delete existing items
        await tx.orderItem.deleteMany({
          where: { orderId: order.id },
        });

        // Fetch products and calculate line totals
        let newSubtotal = 0;
        const newOrderItemsData = [];

        for (const itemDto of dto.items) {
          const product = await tx.product.findUnique({
            where: { id: itemDto.productId },
          });
          if (!product) {
            throw new NotFoundException(`Product with ID ${itemDto.productId} not found`);
          }

          const unitPrice = itemDto.unitPrice !== undefined ? Number(itemDto.unitPrice) : Number(product.sellingPrice);
          const lineTotal = Number((unitPrice * itemDto.quantity).toFixed(2));
          newSubtotal += lineTotal;

          newOrderItemsData.push({
            orderId: order.id,
            productId: product.id,
            quantity: itemDto.quantity,
            unitPrice,
            totalPrice: lineTotal,
          });
        }

        await tx.orderItem.createMany({
          data: newOrderItemsData,
        });

        subtotal = Number(newSubtotal.toFixed(2));
        taxAmount = Number((subtotal * 0.12).toFixed(2)); // 12% GST
        const calculatedTotal = subtotal + taxAmount - discountAmount;
        totalAmount = Math.max(0, Number(calculatedTotal.toFixed(2)));
      } else if (dto.discountAmount !== undefined) {
        const calculatedTotal = subtotal + taxAmount - discountAmount;
        totalAmount = Math.max(0, Number(calculatedTotal.toFixed(2)));
      }

      // 3. Format and append note if approverRemarks or notes provided
      let formattedNotes = order.notes || '';
      if (dto.approverRemarks?.trim()) {
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const remarkEntry = `\n[AMENDMENT by ${user.employeeCode} (${user.role}) - ${timestamp}]: ${dto.approverRemarks.trim()}`;
        formattedNotes = formattedNotes ? `${formattedNotes}${remarkEntry}` : remarkEntry.trim();
      } else if (dto.notes?.trim()) {
        formattedNotes = dto.notes.trim();
      }

      // 4. Update order & lifecycle status transitions if specified
      let targetPaymentStatus = dto.paymentStatus || undefined;
      const targetStatus = (user.role !== RoleType.SALESPERSON && dto.status) ? dto.status : undefined;

      if (targetStatus === OrderStatus.DELIVERED && order.paymentMode === PaymentMode.CASH_ON_DELIVERY) {
        targetPaymentStatus = PaymentStatus.PAID;
      }

      // Handle inventory fulfillment if marked DELIVERED
      if (targetStatus === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
        for (const it of order.items) {
          const inv = await tx.inventory.findUnique({ where: { productId: it.productId } });
          if (inv && inv.reservedQuantity > 0) {
            const newReserved = Math.max(0, inv.reservedQuantity - it.quantity);
            await tx.inventory.update({
              where: { id: inv.id },
              data: { reservedQuantity: newReserved },
            });
            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                type: InventoryTxType.ORDER_FULFILLED,
                quantity: it.quantity,
                balanceAfter: inv.availableQuantity,
                notes: `Fulfilled on delivery update for Order ${order.orderNumber}`,
              },
            });
          }
        }
      }

      // Handle inventory reservation if moving from DRAFT to CONFIRMED
      if (targetStatus === OrderStatus.CONFIRMED && order.status === OrderStatus.DRAFT) {
        const itemsToReserve = dto.items && dto.items.length > 0 ? dto.items : order.items;
        for (const it of itemsToReserve) {
          const inv = await tx.inventory.findUnique({ where: { productId: it.productId } });
          if (inv) {
            const newAvailable = Math.max(0, inv.availableQuantity - it.quantity);
            const newReserved = inv.reservedQuantity + it.quantity;
            await tx.inventory.update({
              where: { id: inv.id },
              data: { availableQuantity: newAvailable, reservedQuantity: newReserved },
            });
            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                type: InventoryTxType.ORDER_RESERVATION,
                quantity: it.quantity,
                balanceAfter: newAvailable,
                notes: `Atomic reservation on confirm for Order ${order.orderNumber}`,
              },
            });
          }
        }
      }

      const resOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          paymentMode: dto.paymentMode || undefined,
          paymentStatus: targetPaymentStatus,
          paymentRef: dto.paymentRef || undefined,
          notes: formattedNotes || undefined,
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, mrpPrice: true, sellingPrice: true, targetDisease: true },
              },
            },
          },
          customer: true,
          createdBy: { select: { id: true, employeeCode: true, firstName: true, lastName: true, role: true } },
        },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ORDER_UPDATED',
          entityType: 'Order',
          entityId: order.id,
          newState: {
            orderNumber: order.orderNumber,
            totalAmount,
            discountAmount,
            updatedBy: user.employeeCode,
            approverRemarks: dto.approverRemarks || null,
          },
        },
      });

      return resOrder;
    });

    // 6. Real-time notification to salesperson who created the order
    if (order.createdById && order.createdById !== user.id) {
      try {
        await this.notificationsService.createNotification({
          userId: order.createdById,
          title: `✏️ Order ${order.orderNumber} Updated by ${user.employeeCode}`,
          message: dto.approverRemarks
            ? `Approval Authority updated your booked order. Remarks: "${dto.approverRemarks}"`
            : `Order details updated by ${user.employeeCode}. Total: ₹${updated.totalAmount}.`,
          type: NotificationType.INFO,
          link: '/sales/orders',
        });
      } catch (err) {
        this.logger.warn(`Failed to dispatch order update notification: ${err}`);
      }
    }

    return updated;
  }

  /**
   * Decide on order: CONFIRM, REJECT, or REQUEST_RECTIFICATION with structured remarks
   */
  async decideOrder(orderId: string, dto: DecideOrderDto, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        customer: true,
        createdBy: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    if (dto.decision === 'CONFIRM') {
      // Execute confirm logic
      const confirmed = await this.confirmOrder(orderId, user);

      // Append confirmation remarks to notes if provided
      if (dto.remarks?.trim()) {
        const remarkEntry = `\n[CONFIRMED by ${user.employeeCode} (${user.role}) - ${timestamp}]: ${dto.remarks.trim()}`;
        await this.prisma.order.update({
          where: { id: order.id },
          data: { notes: (confirmed.notes || '') + remarkEntry },
        });
      }

      // Notify salesperson
      if (order.createdById && order.createdById !== user.id) {
        try {
          await this.notificationsService.createNotification({
            userId: order.createdById,
            title: `✅ Order ${order.orderNumber} Confirmed!`,
            message: `Approval Authority has verified and confirmed your order. Remarks: "${dto.remarks}". Sent to Courier Dispatch.`,
            type: NotificationType.ORDER_CONFIRMED,
            link: '/sales/orders',
          });
        } catch (err) {
          this.logger.warn(`Failed to dispatch confirm notification: ${err}`);
        }
      }

      return {
        success: true,
        decision: 'CONFIRM',
        message: `Order ${order.orderNumber} successfully confirmed and inventory reserved.`,
        order: confirmed,
      };
    }

    // Otherwise: REJECT or REQUEST_RECTIFICATION
    const isRectification = dto.decision === 'REQUEST_RECTIFICATION';
    const statusNotePrefix = isRectification ? 'RECTIFICATION REQUESTED' : 'ORDER REJECTED';

    const result = await this.prisma.$transaction(async (tx) => {
      // Append remarks to order notes
      const remarkEntry = `\n[${statusNotePrefix} by ${user.employeeCode} (${user.role}) - ${timestamp}]: ${dto.rejectionReason ? `[${dto.rejectionReason}] ` : ''}${dto.remarks.trim()}`;
      const updatedNotes = (order.notes || '') + remarkEntry;

      // If REJECT: mark order as CANCELLED. If REQUEST_RECTIFICATION: keep as DRAFT (ready to fix)
      const targetStatus = isRectification ? OrderStatus.DRAFT : OrderStatus.CANCELLED;

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: targetStatus,
          notes: updatedNotes,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          createdBy: true,
        },
      });

      // Update associated lead if any: re-open as FOLLOW_UP_REQUIRED so salesperson sees it immediately
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

      if (associatedLead) {
        await tx.lead.update({
          where: { id: associatedLead.id },
          data: {
            status: LeadStatus.FOLLOW_UP_REQUIRED,
            priority: LeadPriority.URGENT,
          },
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: associatedLead.id,
            fromStatus: associatedLead.status,
            toStatus: LeadStatus.FOLLOW_UP_REQUIRED,
            changedById: user.id,
            reason: `Order ${order.orderNumber} ${isRectification ? 'requires rectification' : 'rejected'}: ${dto.remarks.slice(0, 450)}`,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: isRectification ? 'ORDER_RECTIFICATION_REQUESTED' : 'ORDER_REJECTED',
          entityType: 'Order',
          entityId: order.id,
          newState: {
            orderNumber: order.orderNumber,
            decision: dto.decision,
            reason: dto.rejectionReason || null,
            remarks: dto.remarks,
            decidedBy: user.employeeCode,
          },
        },
      });

      return updatedOrder;
    });

    // Notify booking salesperson
    if (order.createdById) {
      try {
        await this.notificationsService.createNotification({
          userId: order.createdById,
          title: isRectification
            ? `⚠️ Rectification Needed: Order ${order.orderNumber}`
            : `❌ Order ${order.orderNumber} Rejected`,
          message: `Approval Officer ${user.employeeCode} directive: "${dto.remarks}". Click to inspect and fix.`,
          type: NotificationType.WARNING,
          link: '/sales/orders',
        });
      } catch (err) {
        this.logger.warn(`Failed to dispatch rejection notification: ${err}`);
      }
    }

    return {
      success: true,
      decision: dto.decision,
      message: `Order ${order.orderNumber} ${isRectification ? 'marked for rectification' : 'rejected'}. Salesperson notified.`,
      order: result,
    };
  }
}
