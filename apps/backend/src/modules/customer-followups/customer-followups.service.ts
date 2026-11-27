import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchAssignCustomerFollowUpDto } from './dto/batch-assign-customer-follow-up.dto';
import { LogCustomerFollowUpDto } from './dto/log-customer-follow-up.dto';
import { UpdateFollowUpStatusDto } from './dto/update-follow-up-status.dto';
import { CustomerFollowUpQueryDto } from './dto/customer-follow-up-query.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CustomerFollowUpStatus,
  NotificationType,
  RoleType,
} from '@prisma/client';

@Injectable()
export class CustomerFollowupsService {
  private readonly logger = new Logger(CustomerFollowupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Retrieves active salespersons/executives available to receive client follow-ups
   */
  async getFollowUpExecutives() {
    return this.prisma.user.findMany({
      where: {
        role: { in: [RoleType.FOLLOWUP_EXECUTIVE, RoleType.SALESPERSON, RoleType.MANAGEMENT, RoleType.SUPER_ADMIN] },
        isActive: true,
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneNumber: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Super Admin batch allocation: Assigns 5, 6, 10 or more clients to a Follow-Up Executive
   */
  async batchAssign(dto: BatchAssignCustomerFollowUpDto, user: AuthenticatedUser) {
    const executive = await this.prisma.user.findUnique({
      where: { id: dto.assignedToId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });

    if (!executive) {
      throw new NotFoundException(`Executive user with ID ${dto.assignedToId} not found`);
    }

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: dto.customerIds } },
      select: { id: true, customerCode: true, fullName: true },
    });

    if (customers.length === 0) {
      throw new BadRequestException('None of the provided customer IDs exist');
    }

    const scheduledDate = dto.scheduledTime ? new Date(dto.scheduledTime) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const createdItems = [];

      for (const cust of customers) {
        const followUp = await tx.customerFollowUp.create({
          data: {
            customerId: cust.id,
            assignedToId: executive.id,
            assignedById: user.id,
            scheduledTime: scheduledDate,
            campaignObjective: dto.campaignObjective.trim(),
            adminDirectives: dto.adminDirectives?.trim() || null,
            status: CustomerFollowUpStatus.PENDING,
          },
        });
        createdItems.push(followUp);
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'BATCH_CUSTOMER_FOLLOWUP_ALLOCATED',
          entityType: 'CustomerFollowUp',
          entityId: executive.id,
          newState: {
            assignedTo: executive.employeeCode,
            clientCount: customers.length,
            campaignObjective: dto.campaignObjective,
            scheduledDate,
            customerCodes: customers.map((c) => c.customerCode),
          },
        },
      });

      return createdItems;
    });

    // Dispatch real-time notification to the assigned executive
    try {
      await this.notificationsService.createNotification({
        userId: executive.id,
        title: `⚡ ${customers.length} Follow-Up Clients Allocated`,
        message: `Super Admin (${user.employeeCode}) has assigned ${customers.length} client(s) to your care desk. Campaign: "${dto.campaignObjective}".`,
        type: NotificationType.FOLLOWUP_ASSIGNED,
        link: '/sales/customer-care',
      });
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch follow-up allocation notification: ${notifErr}`);
    }

    return {
      success: true,
      message: `Successfully allocated ${customers.length} client(s) to ${executive.firstName} ${executive.lastName} (${executive.employeeCode}).`,
      count: customers.length,
      data: result,
    };
  }

  /**
   * Get follow-up agenda for currently logged-in executive
   */
  async getMyFollowUps(query: CustomerFollowUpQueryDto, user: AuthenticatedUser) {
    const where: any = {
      assignedToId: user.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.customer = {
        OR: [
          { fullName: { contains: s, mode: 'insensitive' } },
          { phoneNumber: { contains: s } },
          { customerCode: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.customerFollowUp.count({ where }),
      this.prisma.customerFollowUp.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'desc' }],
        include: {
          customer: {
            include: {
              orders: {
                orderBy: { createdAt: 'desc' },
                include: {
                  items: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          sku: true,
                          name: true,
                          sellingPrice: true,
                          targetDisease: true,
                          dosageInstructions: true,
                        },
                      },
                    },
                  },
                  shipment: {
                    select: {
                      id: true,
                      trackingAwb: true,
                      trackingUrl: true,
                      courierPartner: true,
                      status: true,
                      dispatchedAt: true,
                      deliveredAt: true,
                    },
                  },
                },
              },
            },
          },
          assignedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          logs: {
            orderBy: { createdAt: 'desc' },
            include: {
              caller: {
                select: { id: true, employeeCode: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Super Admin & Management Master overview of all client follow-ups
   */
  async getAllFollowUps(query: CustomerFollowUpQueryDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.customer = {
        OR: [
          { fullName: { contains: s, mode: 'insensitive' } },
          { phoneNumber: { contains: s } },
          { customerCode: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.customerFollowUp.count({ where }),
      this.prisma.customerFollowUp.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'desc' }],
        include: {
          customer: {
            include: {
              orders: {
                orderBy: { createdAt: 'desc' },
                include: {
                  items: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          sku: true,
                          name: true,
                          sellingPrice: true,
                          targetDisease: true,
                          dosageInstructions: true,
                        },
                      },
                    },
                  },
                  shipment: true,
                },
              },
            },
          },
          assignedTo: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          assignedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          logs: {
            orderBy: { createdAt: 'desc' },
            include: {
              caller: {
                select: { id: true, employeeCode: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve a single follow-up detail
   */
  async getFollowUpById(id: string) {
    const item = await this.prisma.customerFollowUp.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            orders: {
              orderBy: { createdAt: 'desc' },
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
                shipment: true,
              },
            },
          },
        },
        assignedTo: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          include: {
            caller: {
              select: { id: true, employeeCode: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Customer follow-up with ID ${id} not found`);
    }

    return item;
  }

  /**
   * Record consultation notes, patient relief rating, and schedule next follow-up
   */
  async logConsultation(id: string, dto: LogCustomerFollowUpDto, user: AuthenticatedUser) {
    const followUp = await this.prisma.customerFollowUp.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!followUp) {
      throw new NotFoundException(`Customer follow-up with ID ${id} not found`);
    }

    const nextDate = dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create immutable consultation log
      const log = await tx.customerFollowUpLog.create({
        data: {
          followUpId: followUp.id,
          callerId: user.id,
          disposition: dto.disposition.trim(),
          healthRating: dto.healthRating || null,
          consultationNotes: dto.consultationNotes.trim(),
          patientFeedback: dto.patientFeedback?.trim() || null,
          refillRequested: dto.refillRequested || false,
          nextFollowUpDate: nextDate,
          callDurationSeconds: dto.callDurationSeconds || 0,
        },
      });

      // 2. Update follow-up record
      const nextStatus = nextDate
        ? CustomerFollowUpStatus.RESCHEDULED
        : CustomerFollowUpStatus.COMPLETED;

      const updatedFollowUp = await tx.customerFollowUp.update({
        where: { id: followUp.id },
        data: {
          status: nextStatus,
          completedAt: new Date(),
          scheduledTime: nextDate || followUp.scheduledTime,
        },
      });

      // 3. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_FOLLOWUP_LOGGED',
          entityType: 'CustomerFollowUp',
          entityId: followUp.id,
          newState: {
            customerCode: followUp.customer.customerCode,
            disposition: dto.disposition,
            healthRating: dto.healthRating,
            refillRequested: dto.refillRequested,
            nextFollowUpDate: nextDate,
            loggedBy: user.employeeCode,
          },
        },
      });

      return { log, followUp: updatedFollowUp };
    });

    return {
      success: true,
      message: 'Consultation notes and patient health feedback successfully recorded.',
      data: result,
    };
  }

  /**
   * Update follow-up status directly (e.g. PENDING -> COMPLETED, RESCHEDULED, IN_PROGRESS, CANCELLED)
   */
  async updateFollowUpStatus(id: string, dto: UpdateFollowUpStatusDto, user: AuthenticatedUser) {
    const followUp = await this.prisma.customerFollowUp.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!followUp) {
      throw new NotFoundException(`Customer follow-up with ID ${id} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const isCompleted = dto.status === CustomerFollowUpStatus.COMPLETED;

      const res = await tx.customerFollowUp.update({
        where: { id },
        data: {
          status: dto.status,
          completedAt: isCompleted ? new Date() : (dto.status === CustomerFollowUpStatus.PENDING ? null : followUp.completedAt),
        },
      });

      // If notes or disposition provided, create a consultation log
      if (dto.notes?.trim() || dto.disposition) {
        await tx.customerFollowUpLog.create({
          data: {
            followUpId: id,
            callerId: user.id,
            disposition: dto.disposition?.trim() || `STATUS_${dto.status}`,
            consultationNotes: dto.notes?.trim() || `Status updated from ${followUp.status} to ${dto.status}`,
            callDurationSeconds: 60,
          },
        });
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_FOLLOWUP_STATUS_UPDATED',
          entityType: 'CustomerFollowUp',
          entityId: id,
          oldState: { status: followUp.status },
          newState: { status: dto.status, notes: dto.notes, disposition: dto.disposition },
        },
      });

      return res;
    });

    return {
      success: true,
      message: `Follow-up status successfully changed to ${dto.status}.`,
      data: updated,
    };
  }
}
