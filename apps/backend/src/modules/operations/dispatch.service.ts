import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  InventoryTxType,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  ShipmentStatus,
  NotificationType,
  RoleType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Retrieves all confirmed & billed formulation orders awaiting courier dispatch
   * STRICT INVARIANT: Order MUST have an issued tax invoice before appearing in the dispatch queue
   */
  async getReadyOrders() {
    return this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PROCESSING, OrderStatus.CONFIRMED] },
        invoice: { isNot: null },
        shipment: null,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phoneNumber: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
          },
        },
      },
    });
  }

  /**
   * List all shipments with order, customer, and invoice details
   */
  async findAll(page = 1, limit = 20, status?: ShipmentStatus) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
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
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  grandTotal: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Assign courier partner, generate consignment record, and advance order to SHIPPED
   */
  async createShipment(
    orderId: string,
    dto: CreateShipmentDto,
    user: AuthenticatedUser,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipment: true,
        customer: {
          include: {
            convertedFrom: true,
          },
        },
        createdBy: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status === OrderStatus.DRAFT) {
      throw new BadRequestException('Cannot dispatch a DRAFT order. Order must be confirmed first.');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot dispatch a CANCELLED order');
    }

    // Invariant: Tax Invoice must be generated in Billing before dispatch
    const orderInvoice = await this.prisma.invoice.findUnique({
      where: { orderId: order.id },
    });
    if (!orderInvoice) {
      throw new BadRequestException(
        'Cannot dispatch order. Tax invoice must be generated in the Billing section before courier consignment.',
      );
    }

    if (order.shipment) {
      throw new ConflictException(
        `Shipment already manifested for order ${order.orderNumber} with AWB ${order.shipment.trackingAwb}`,
      );
    }

    const existingAwb = await this.prisma.shipment.findUnique({
      where: { trackingAwb: dto.trackingAwb.trim() },
    });

    if (existingAwb) {
      throw new ConflictException(
        `Consignment with AWB "${dto.trackingAwb}" already exists in the system`,
      );
    }

    const createdShipment = await this.prisma.$transaction(async (tx) => {
      // 1. Create Shipment
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          courierPartner: dto.courierPartner.trim(),
          trackingAwb: dto.trackingAwb.trim(),
          trackingUrl: dto.trackingUrl?.trim(),
          status: ShipmentStatus.MANIFESTED,
          dispatchedAt: new Date(),
        },
      });

      // 2. Advance Order status to SHIPPED
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.SHIPPED },
      });

      // 3. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ORDER_DISPATCHED',
          entityType: 'Shipment',
          entityId: shipment.id,
          newState: {
            orderNumber: order.orderNumber,
            courierPartner: shipment.courierPartner,
            trackingAwb: shipment.trackingAwb,
            dispatchedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Order ${order.orderNumber} dispatched via ${shipment.courierPartner} (AWB: ${shipment.trackingAwb}) by ${user.employeeCode}`,
      );

      return shipment;
    });

    // 4. Send Real-Time Push Notification directly to the Salesperson who closed/booked this deal
    try {
      const salesUserIds = new Set<string>();
      if (order.createdById) {
        salesUserIds.add(order.createdById);
      }
      if (order.customer?.convertedFrom?.assignedToId) {
        salesUserIds.add(order.customer.convertedFrom.assignedToId);
      }
      if (order.customer?.convertedFrom?.createdById) {
        salesUserIds.add(order.customer.convertedFrom.createdById);
      }

      // Also look up any related lead matching the customer's phone number
      if (order.customer?.phoneNumber) {
        const phoneDigits = order.customer.phoneNumber.replace(/\D/g, '').slice(-10);
        const relatedLeads = await this.prisma.lead.findMany({
          where: {
            OR: [
              { phoneNumber: order.customer.phoneNumber },
              { phoneNumber: phoneDigits },
              { phoneNumber: `+91${phoneDigits}` },
            ],
          },
          select: { assignedToId: true, createdById: true },
        });
        for (const ld of relatedLeads) {
          if (ld.assignedToId) salesUserIds.add(ld.assignedToId);
          if (ld.createdById) salesUserIds.add(ld.createdById);
        }
      }

      const clientName = order.customer?.fullName || 'Patient';
      for (const salesUserId of salesUserIds) {
        await this.notificationsService.createNotification({
          userId: salesUserId,
          title: `📦 Order ${order.orderNumber} Dispatched!`,
          message: `Good news! Your patient ${clientName}'s Ayurvedic formulation parcel has been handed over to ${createdShipment.courierPartner} (AWB: ${createdShipment.trackingAwb}).`,
          type: NotificationType.DISPATCH_UPDATE,
          link: `/sales`,
        });
      }

      // Also notify all Salespersons if no specific creator was linked
      if (salesUserIds.size === 0) {
        await this.notificationsService.dispatchToRole(
          [RoleType.SALESPERSON],
          {
            title: `📦 Order ${order.orderNumber} Dispatched!`,
            message: `Ayurvedic formulation parcel for ${clientName} handed over to ${createdShipment.courierPartner} (AWB: ${createdShipment.trackingAwb}).`,
            type: NotificationType.DISPATCH_UPDATE,
            link: `/sales`,
          },
        );
      }

      // Also notify Super Admin & Management Operations
      await this.notificationsService.dispatchToRole(
        [RoleType.SUPER_ADMIN, RoleType.MANAGEMENT],
        {
          title: `🚚 Order ${order.orderNumber} Dispatched`,
          message: `Consignment manifested via ${createdShipment.courierPartner} (AWB: ${createdShipment.trackingAwb}) by ${user.employeeCode}.`,
          type: NotificationType.INFO,
          link: `/management/dispatch`,
        },
      );
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch salesperson notifications: ${notifErr}`);
    }

    return createdShipment;
  }

  /**
   * Updates shipment status (e.g. IN_TRANSIT, DELIVERED, RTO) with inventory fulfillment/reversal
   */
  async updateStatus(
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
    user: AuthenticatedUser,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: {
            items: true,
            customer: {
              include: {
                convertedFrom: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    const updatedShipment = await this.prisma.$transaction(async (tx) => {
      let deliveredAt = shipment.deliveredAt;

      // Handle delivery fulfillment
      if (dto.status === ShipmentStatus.DELIVERED) {
        deliveredAt = new Date();

        // 1. Mark order DELIVERED and mark COD as PAID
        await tx.order.update({
          where: { id: shipment.orderId },
          data: {
            status: OrderStatus.DELIVERED,
            paymentStatus:
              shipment.order.paymentMode === PaymentMode.CASH_ON_DELIVERY
                ? PaymentStatus.PAID
                : shipment.order.paymentStatus,
          },
        });

        // 2. Fulfill reserved inventory
        for (const item of shipment.order.items) {
          const inv = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });

          if (inv) {
            const newReserved = Math.max(0, inv.reservedQuantity - item.quantity);
            await tx.inventory.update({
              where: { id: inv.id },
              data: { reservedQuantity: newReserved },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inv.id,
                type: InventoryTxType.ORDER_FULFILLED,
                quantity: item.quantity,
                balanceAfter: inv.availableQuantity,
                notes: `Fulfilled for delivered Order ${shipment.order.orderNumber}`,
              },
            });
          }
        }
      } else if (dto.status === ShipmentStatus.RTO) {
        // Return-to-Origin: Return stock to available pool
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.RETURNED },
        });

        for (const item of shipment.order.items) {
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
                notes: `RTO return restocked for Order ${shipment.order.orderNumber}`,
              },
            });
          }
        }
      }

      // Update Shipment record
      const updated = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: dto.status,
          deliveredAt,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'SHIPMENT_STATUS_UPDATED',
          entityType: 'Shipment',
          entityId: shipment.id,
          newState: {
            trackingAwb: shipment.trackingAwb,
            status: dto.status,
            updatedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Shipment ${shipment.trackingAwb} updated to ${dto.status} by ${user.employeeCode}`,
      );

      return updated;
    });

    // Send status update notification to the salesperson
    try {
      const salesUserIds = new Set<string>();
      if (shipment.order.createdById) {
        salesUserIds.add(shipment.order.createdById);
      }
      if (shipment.order.customer?.convertedFrom?.assignedToId) {
        salesUserIds.add(shipment.order.customer.convertedFrom.assignedToId);
      }

      const isDelivered = dto.status === ShipmentStatus.DELIVERED;
      const isRTO = dto.status === ShipmentStatus.RTO;
      const clientName = shipment.order.customer?.fullName || 'Patient';

      for (const salesUserId of salesUserIds) {
        await this.notificationsService.createNotification({
          userId: salesUserId,
          title: isDelivered
            ? `🎉 Order ${shipment.order.orderNumber} Delivered!`
            : isRTO
              ? `⚠️ Order ${shipment.order.orderNumber} Returned (RTO)`
              : `🚚 Order ${shipment.order.orderNumber} Status: ${dto.status}`,
          message: isDelivered
            ? `Ayurvedic course successfully delivered to ${clientName}. Payment settled.`
            : isRTO
              ? `Parcel for ${clientName} returned by courier ${shipment.courierPartner}. Stock restored.`
              : `Courier updated consignment ${shipment.trackingAwb} to ${dto.status}.`,
          type: isDelivered ? NotificationType.SUCCESS : isRTO ? NotificationType.WARNING : NotificationType.DISPATCH_UPDATE,
          link: `/sales/calling`,
        });
      }
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch salesperson status notification: ${notifErr}`);
    }

    return updatedShipment;
  }

  /**
   * Retrieves shipment details for an order
   */
  async findByOrderId(orderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            customer: true,
            invoice: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment for order ID ${orderId} not found`);
    }

    return shipment;
  }
}
