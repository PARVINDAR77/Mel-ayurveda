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
import { LogOFDCallDto, EscalateToRtoDto } from './dto/ofd-calling.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  InventoryTxType,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  ShipmentStatus,
  OFDCallStatus,
  NotificationType,
  RoleType,
  ReturnStatus,
  ReturnReason,
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
  async findAll(page = 1, limit = 50, status?: ShipmentStatus) {
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
        // Return-to-Origin: Return stock to available pool & queue in Return Orders section
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.RETURNED },
        });

        // Ensure OrderReturn record exists for investigation & customer calling
        const existingReturn = await tx.orderReturn.findFirst({
          where: { orderId: shipment.orderId },
        });

        if (!existingReturn) {
          const year = new Date().getFullYear();
          const count = await tx.orderReturn.count();
          const returnCode = `MEL-RET-${year}-${String(count + 1).padStart(6, '0')}`;

          await tx.orderReturn.create({
            data: {
              returnCode,
              orderId: shipment.orderId,
              shipmentId: shipment.id,
              status: ReturnStatus.PENDING_CALL,
              returnReason: ReturnReason.CUSTOMER_REFUSED,
              customerRemarks: 'Courier reported RTO / Failed delivery attempt at destination.',
              handledById: user.id,
              isRestocked: true,
              restockedAt: new Date(),
            },
          });
        }

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

  /**
   * Helper to generate unique return reference
   */
  private async generateReturnCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.orderReturn.count();
    const sequence = String(count + 1).padStart(6, '0');
    return `MEL-RET-${year}-${sequence}`;
  }

  /**
   * Retrieves shipments currently in OUT_FOR_DELIVERY or active doorstep calling stage
   */
  async getOfdQueue(page = 1, limit = 50, courierPartner?: string, ofdStatus?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Filter by courier partner if provided
    if (courierPartner && courierPartner !== 'ALL') {
      where.courierPartner = courierPartner;
    }

    // Filter by OFD status or default to active queue
    if (ofdStatus && ofdStatus !== 'ALL') {
      where.ofdCallStatus = ofdStatus as OFDCallStatus;
    }

    // Search by customer name, phone, order number, tracking AWB
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { trackingAwb: { contains: s, mode: 'insensitive' } },
        { order: { orderNumber: { contains: s, mode: 'insensitive' } } },
        { order: { customer: { fullName: { contains: s, mode: 'insensitive' } } } },
        { order: { customer: { phoneNumber: { contains: s } } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ ofdCallStatus: 'asc' }, { updatedAt: 'desc' }],
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  customerCode: true,
                  fullName: true,
                  phoneNumber: true,
                  alternatePhone: true,
                  city: true,
                  state: true,
                  address: true,
                  pincode: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true, sellingPrice: true, targetDisease: true },
                  },
                },
              },
              createdBy: {
                select: { id: true, employeeCode: true, firstName: true, lastName: true },
              },
              invoice: {
                select: { id: true, invoiceNumber: true, grandTotal: true },
              },
            },
          },
          returns: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          ofdConfirmedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
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
   * Retrieves summary metrics for the OFD Delivery Calling Desk
   */
  async getOfdStats() {
    const [totalOfd, confirmedDelivered, rescheduled, refused, allConfirmed] = await Promise.all([
      this.prisma.shipment.count({
        where: {
          OR: [
            { status: ShipmentStatus.OUT_FOR_DELIVERY },
            { ofdCallStatus: { not: OFDCallStatus.PENDING_CALL } },
          ],
        },
      }),
      this.prisma.shipment.count({
        where: { ofdCallStatus: OFDCallStatus.DELIVERED_CONFIRMED },
      }),
      this.prisma.shipment.count({
        where: { ofdCallStatus: OFDCallStatus.RE_ATTEMPT_SCHEDULED },
      }),
      this.prisma.shipment.count({
        where: { ofdCallStatus: OFDCallStatus.DOORSTEP_REFUSED },
      }),
      this.prisma.shipment.findMany({
        where: { ofdCallStatus: OFDCallStatus.DELIVERED_CONFIRMED },
        select: { codAmountCollected: true, order: { select: { totalAmount: true } } },
      }),
    ]);

    const totalCodCollected = allConfirmed.reduce((sum, item) => {
      const amt = item.codAmountCollected ? Number(item.codAmountCollected) : Number(item.order?.totalAmount || 0);
      return sum + amt;
    }, 0);

    return {
      totalOfd,
      confirmedDelivered,
      rescheduled,
      refused,
      totalCodCollected,
      confirmationRate: totalOfd > 0 ? Math.round((confirmedDelivered / totalOfd) * 100) : 0,
    };
  }

  /**
   * Records a customer doorstep call disposition and executes state transitions
   */
  async logOfdCall(shipmentId: string, dto: LogOFDCallDto, user: AuthenticatedUser) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: { include: { items: true, customer: true } } },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    const isDelivered = dto.callOutcome === OFDCallStatus.DELIVERED_CONFIRMED;
    const isRefused = dto.callOutcome === OFDCallStatus.DOORSTEP_REFUSED;
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Shipment OFD fields
      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          ofdCallStatus: dto.callOutcome,
          ofdCallAttempts: { increment: 1 },
          ofdLastCalledAt: now,
          ofdCallNotes: dto.callNotes || null,
          ofdCustomerReason: dto.customerRemarks || null,
          ofdRescheduleDate: dto.rescheduleDate ? new Date(dto.rescheduleDate) : null,
          ofdConfirmedById: user.id,
          codAmountCollected: dto.codAmountCollected ? Number(dto.codAmountCollected) : null,
          status: isDelivered
            ? ShipmentStatus.DELIVERED
            : isRefused
            ? ShipmentStatus.RTO
            : shipment.status,
          deliveredAt: isDelivered ? now : shipment.deliveredAt,
        },
      });

      // 2. If customer picked / parcel delivered: fulfill order & mark COD as paid
      if (isDelivered) {
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

        // Fulfill reserved warehouse inventory
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
                notes: `OFD Doorstep Verified Delivery. Parcel picked by customer ${shipment.order.customer?.fullName || ''} (Order ${shipment.order.orderNumber}).`,
              },
            });
          }
        }
      }

      // 3. If customer refused at doorstep: automatically create OrderReturn and route to Return & RTO Desk
      if (isRefused) {
        const returnCode = await this.generateReturnCode();
        await tx.orderReturn.create({
          data: {
            returnCode,
            orderId: shipment.orderId,
            shipmentId: shipment.id,
            status: ReturnStatus.CALL_CONNECTED,
            returnReason: dto.reasonCategory || ReturnReason.CUSTOMER_REFUSED,
            callOutcome: 'DOORSTEP_REFUSED',
            callNotes: dto.callNotes || 'Doorstep refusal confirmed via OFD calling.',
            customerRemarks: dto.customerRemarks || 'Customer refused parcel at delivery door.',
            handledById: user.id,
          },
        });
      }

      return updatedShipment;
    });

    this.logger.log(
      `OFD Call logged for shipment ${shipment.trackingAwb}. Outcome: ${dto.callOutcome} by ${user.employeeCode}`,
    );

    return result;
  }

  /**
   * Direct delivery confirmation action from the OFD desk
   */
  async confirmOfdDelivery(shipmentId: string, codAmountCollected?: number, notes?: string, user?: AuthenticatedUser) {
    return this.logOfdCall(
      shipmentId,
      {
        callOutcome: OFDCallStatus.DELIVERED_CONFIRMED,
        codAmountCollected,
        customerRemarks: 'Parcel confirmed picked and received by customer.',
        callNotes: notes || 'Delivery confirmed via OFD calling desk.',
      },
      user || ({ id: 'system', employeeCode: 'SYSTEM' } as AuthenticatedUser),
    );
  }

  /**
   * Direct RTO escalation from OFD desk
   */
  async escalateToRto(shipmentId: string, dto: EscalateToRtoDto, user: AuthenticatedUser) {
    return this.logOfdCall(
      shipmentId,
      {
        callOutcome: OFDCallStatus.DOORSTEP_REFUSED,
        reasonCategory: dto.reason,
        customerRemarks: dto.customerRemarks,
        callNotes: dto.callNotes || 'Direct RTO escalation from OFD calling desk.',
      },
      user,
    );
  }
}
