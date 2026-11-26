import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  ReturnStatus,
  ReturnReason,
  OrderStatus,
  InventoryTxType,
  ShipmentStatus,
} from '@prisma/client';
import { InitiateReturnDto } from './dto/initiate-return.dto';
import { LogReturnCallDto } from './dto/log-return-call.dto';
import { ResolveReturnDto } from './dto/resolve-return.dto';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a unique sequential return code: MEL-RET-YYYY-NNNNNN
   */
  private async generateReturnCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.orderReturn.count();
    const sequence = String(count + 1).padStart(6, '0');
    return `MEL-RET-${year}-${sequence}`;
  }

  /**
   * Initiates or queues an order for return / RTO investigation
   */
  async initiateReturn(dto: InitiateReturnDto, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { shipment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    // Check if an active return case already exists
    const existing = await this.prisma.orderReturn.findFirst({
      where: {
        orderId: dto.orderId,
        status: {
          in: [
            ReturnStatus.PENDING_CALL,
            ReturnStatus.CALL_CONNECTED,
            ReturnStatus.CUSTOMER_UNREACHABLE,
          ],
        },
      },
    });

    if (existing) {
      return existing;
    }

    const returnCode = await this.generateReturnCode();

    const orderReturn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orderReturn.create({
        data: {
          returnCode,
          orderId: order.id,
          shipmentId: order.shipment?.id || null,
          status: ReturnStatus.PENDING_CALL,
          returnReason: dto.returnReason || ReturnReason.OTHER,
          customerRemarks: dto.remarks || null,
          handledById: user.id,
        },
      });

      // If shipment exists and not already RTO, mark shipment RTO
      if (order.shipment && order.shipment.status !== ShipmentStatus.RTO) {
        await tx.shipment.update({
          where: { id: order.shipment.id },
          data: { status: ShipmentStatus.RTO },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'RETURN_INITIATED',
          entityType: 'OrderReturn',
          entityId: created.id,
          newState: {
            returnCode: created.returnCode,
            orderNumber: order.orderNumber,
            reason: created.returnReason,
          },
        },
      });

      return created;
    });

    this.logger.log(`Initiated return ${orderReturn.returnCode} for Order ${order.orderNumber}`);
    return orderReturn;
  }

  /**
   * Retrieves all active returns requiring customer call and resolution
   */
  async getQueue() {
    return this.prisma.orderReturn.findMany({
      where: {
        status: {
          in: [
            ReturnStatus.PENDING_CALL,
            ReturnStatus.CALL_CONNECTED,
            ReturnStatus.CUSTOMER_UNREACHABLE,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
            invoice: {
              select: { id: true, invoiceNumber: true, grandTotal: true },
            },
          },
        },
        shipment: true,
        handledBy: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    });
  }

  /**
   * Retrieves historical completed / resolved returns with search and filters
   */
  async getHistory(
    page = 1,
    limit = 50,
    reason?: ReturnReason,
    status?: ReturnStatus,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      status: {
        in: [
          ReturnStatus.RESTOCKED_AND_CLOSED,
          ReturnStatus.RE_ATTEMPT_SCHEDULED,
          ReturnStatus.RETURN_APPROVED,
          ReturnStatus.REJECTED,
        ],
      },
    };

    if (reason) where.returnReason = reason;
    if (status) where.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { returnCode: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { order: { customer: { fullName: { contains: q, mode: 'insensitive' } } } },
        { order: { customer: { phoneNumber: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.orderReturn.count({ where }),
      this.prisma.orderReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          order: {
            include: {
              customer: true,
              items: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true },
                  },
                },
              },
              invoice: {
                select: { id: true, invoiceNumber: true, grandTotal: true },
              },
            },
          },
          shipment: true,
          handledBy: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
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
   * Returns aggregated stats for Return Orders Dashboard
   */
  async getStats() {
    const [pendingCalls, totalReturns, totalRestocked, totalFeesAggregate, reAttempts] =
      await Promise.all([
        this.prisma.orderReturn.count({
          where: {
            status: {
              in: [
                ReturnStatus.PENDING_CALL,
                ReturnStatus.CALL_CONNECTED,
                ReturnStatus.CUSTOMER_UNREACHABLE,
              ],
            },
          },
        }),
        this.prisma.orderReturn.count(),
        this.prisma.orderReturn.count({
          where: { isRestocked: true },
        }),
        this.prisma.orderReturn.aggregate({
          _sum: { returnFeeCharged: true },
        }),
        this.prisma.orderReturn.count({
          where: { status: ReturnStatus.RE_ATTEMPT_SCHEDULED },
        }),
      ]);

    const reasonsGroup = await this.prisma.orderReturn.groupBy({
      by: ['returnReason'],
      _count: { id: true },
    });

    return {
      pendingCalls,
      totalReturns,
      totalRestocked,
      totalFeeCollected: Number(totalFeesAggregate._sum.returnFeeCharged || 0),
      reAttempts,
      reasonsBreakdown: reasonsGroup.map((r) => ({
        reason: r.returnReason,
        count: r._count.id,
      })),
    };
  }

  /**
   * Logs a phone call conversation with the customer regarding the failed delivery
   */
  async logCall(returnId: string, dto: LogReturnCallDto, user: AuthenticatedUser) {
    const orderReturn = await this.prisma.orderReturn.findUnique({
      where: { id: returnId },
      include: { order: true },
    });

    if (!orderReturn) {
      throw new NotFoundException(`OrderReturn with ID ${returnId} not found`);
    }

    const nextStatus =
      dto.callOutcome === 'CONNECTED'
        ? ReturnStatus.CALL_CONNECTED
        : ReturnStatus.CUSTOMER_UNREACHABLE;

    const updated = await this.prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        callOutcome: dto.callOutcome,
        returnReason: dto.returnReason,
        customerRemarks: dto.customerRemarks || orderReturn.customerRemarks,
        callNotes: dto.callNotes || orderReturn.callNotes,
        lastCalledAt: new Date(),
        callAttemptCount: { increment: 1 },
        status: nextStatus,
        handledById: user.id,
      },
      include: { order: { include: { customer: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RETURN_CALL_LOGGED',
        entityType: 'OrderReturn',
        entityId: returnId,
        newState: {
          returnCode: updated.returnCode,
          callOutcome: dto.callOutcome,
          reason: dto.returnReason,
        },
      },
    });

    return updated;
  }

  /**
   * Final resolution of the return:
   * - RESTOCKED_AND_CLOSED: Return stock to available inventory & mark order RETURNED
   * - RE_ATTEMPT_SCHEDULED: Re-queue to courier dispatch
   * - REJECTED: Reject return claim
   */
  async resolveReturn(returnId: string, dto: ResolveReturnDto, user: AuthenticatedUser) {
    const orderReturn = await this.prisma.orderReturn.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
          },
        },
        shipment: true,
      },
    });

    if (!orderReturn) {
      throw new NotFoundException(`OrderReturn with ID ${returnId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      let isRestocked = orderReturn.isRestocked;
      let restockedAt = orderReturn.restockedAt;

      // Handle Restock to Warehouse
      if (
        dto.resolutionStatus === ReturnStatus.RESTOCKED_AND_CLOSED ||
        dto.resolutionStatus === ReturnStatus.RETURN_APPROVED
      ) {
        // Mark order as RETURNED
        await tx.order.update({
          where: { id: orderReturn.orderId },
          data: { status: OrderStatus.RETURNED },
        });

        // Restock available inventory if not already restocked
        if (!isRestocked) {
          for (const item of orderReturn.order.items) {
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
                  type: InventoryTxType.RESTOCK,
                  quantity: item.quantity,
                  balanceAfter: newAvailable,
                  notes: `Restocked from Return ${orderReturn.returnCode} (Order ${orderReturn.order.orderNumber})`,
                },
              });
            }
          }
          isRestocked = true;
          restockedAt = new Date();
        }
      } else if (dto.resolutionStatus === ReturnStatus.RE_ATTEMPT_SCHEDULED) {
        // Order customer agreed to accept parcel: reset order to PROCESSING or CONFIRMED
        await tx.order.update({
          where: { id: orderReturn.orderId },
          data: { status: OrderStatus.CONFIRMED },
        });

        // If shipment exists, reset shipment to MANIFESTED for re-dispatch
        if (orderReturn.shipmentId) {
          await tx.shipment.update({
            where: { id: orderReturn.shipmentId },
            data: { status: ShipmentStatus.MANIFESTED },
          });
        }
      }

      // Update the return record
      const resolved = await tx.orderReturn.update({
        where: { id: returnId },
        data: {
          status: dto.resolutionStatus,
          returnFeeCharged: dto.returnFeeCharged !== undefined ? dto.returnFeeCharged : orderReturn.returnFeeCharged,
          feePaymentMode: dto.feePaymentMode || orderReturn.feePaymentMode,
          feePaymentRef: dto.feePaymentRef || orderReturn.feePaymentRef,
          callNotes: dto.settlementNotes
            ? `${orderReturn.callNotes || ''}\n[Settlement]: ${dto.settlementNotes}`.trim()
            : orderReturn.callNotes,
          isRestocked,
          restockedAt,
          handledById: user.id,
        },
        include: {
          order: {
            include: { customer: true, items: true },
          },
          shipment: true,
          handledBy: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'RETURN_RESOLVED',
          entityType: 'OrderReturn',
          entityId: returnId,
          newState: {
            returnCode: resolved.returnCode,
            status: resolved.status,
            isRestocked: resolved.isRestocked,
            returnFeeCharged: resolved.returnFeeCharged,
          },
        },
      });

      return resolved;
    });
  }

  /**
   * Retrieve single return record by ID
   */
  async findOne(id: string) {
    const record = await this.prisma.orderReturn.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
            invoice: true,
          },
        },
        shipment: true,
        handledBy: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`OrderReturn with ID ${id} not found`);
    }

    return record;
  }
}
