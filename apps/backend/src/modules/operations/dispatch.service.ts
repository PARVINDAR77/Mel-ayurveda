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
import { InventoryTxType, OrderStatus, PaymentMode, PaymentStatus, ShipmentStatus } from '@prisma/client';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        customer: true,
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

    return this.prisma.$transaction(async (tx) => {
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
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${shipmentId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
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
      const updatedShipment = await tx.shipment.update({
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

      return updatedShipment;
    });
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
