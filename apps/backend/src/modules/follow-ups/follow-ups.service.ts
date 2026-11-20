import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { RescheduleFollowUpDto } from './dto/update-follow-up.dto';
import {
  FollowUpQueryDto,
  FollowUpFilterStatus,
  FollowUpDateRange,
} from './dto/follow-up-query.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { FollowUpStatus, LeadStatus, RoleType } from '@prisma/client';
import { sanitizeLeadForSalesperson } from '../leads/dto/lead-projections';

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Schedule a new callback for a lead.
   * ANTI-IDOR: Salespersons can only schedule callbacks for their assigned leads.
   */
  async createFollowUp(dto: CreateFollowUpDto, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
    }

    if (user.role === RoleType.SALESPERSON && lead.assignedToId !== user.id) {
      this.logger.warn(
        `IDOR Violation: Salesperson ${user.employeeCode} attempted to schedule follow-up for lead ${lead.leadCode} assigned to ${lead.assignedToId}`,
      );
      throw new ForbiddenException(
        'Access denied: You can only schedule follow-ups for leads assigned to you',
      );
    }

    const scheduledDate = new Date(dto.scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduled callback timestamp format');
    }

    const assignedToId =
      user.role === RoleType.SALESPERSON
        ? user.id
        : dto.assignedToId || lead.assignedToId || user.id;

    return this.prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.create({
        data: {
          leadId: lead.id,
          assignedToId,
          scheduledTime: scheduledDate,
          reminderNotes: dto.reminderNotes,
          status: FollowUpStatus.SCHEDULED,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Advance lead status to FOLLOW_UP_REQUIRED if in initial contact stages
      if (
        lead.status === LeadStatus.NEW ||
        lead.status === LeadStatus.ASSIGNED ||
        lead.status === LeadStatus.CONTACTED
      ) {
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.FOLLOW_UP_REQUIRED },
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: lead.id,
            fromStatus: lead.status,
            toStatus: LeadStatus.FOLLOW_UP_REQUIRED,
            changedById: user.id,
            reason: `Follow-up scheduled for ${scheduledDate.toISOString()}`,
          },
        });
      }

      return followUp;
    });
  }

  /**
   * Retrieves follow-ups for the current salesperson with overdue recalculation
   */
  async getMyFollowUps(query: FollowUpQueryDto, user: AuthenticatedUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Synchronize overdue statuses automatically
    await this.prisma.followUp.updateMany({
      where: {
        assignedToId: user.id,
        status: FollowUpStatus.SCHEDULED,
        scheduledTime: { lt: now },
      },
      data: {
        status: FollowUpStatus.OVERDUE,
      },
    });

    // 2. Build where clause
    const where: any = {
      assignedToId: user.id,
    };

    if (query.status && query.status !== FollowUpFilterStatus.ALL) {
      where.status = query.status as FollowUpStatus;
    }

    if (query.range) {
      if (query.range === FollowUpDateRange.TODAY) {
        where.scheduledTime = { gte: startOfToday, lte: endOfToday };
      } else if (query.range === FollowUpDateRange.UPCOMING) {
        where.scheduledTime = { gt: endOfToday };
        where.status = FollowUpStatus.SCHEDULED;
      } else if (query.range === FollowUpDateRange.OVERDUE) {
        where.status = FollowUpStatus.OVERDUE;
      }
    }

    const [total, followUps, dueTodayCount, overdueCount, completedTodayCount] =
      await Promise.all([
        this.prisma.followUp.count({ where }),
        this.prisma.followUp.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledTime: 'asc' },
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
                priority: true,
                status: true,
                assignedToId: true,
              },
            },
          },
        }),
        this.prisma.followUp.count({
          where: {
            assignedToId: user.id,
            status: { in: [FollowUpStatus.SCHEDULED, FollowUpStatus.OVERDUE] },
            scheduledTime: { gte: startOfToday, lte: endOfToday },
          },
        }),
        this.prisma.followUp.count({
          where: {
            assignedToId: user.id,
            status: FollowUpStatus.OVERDUE,
          },
        }),
        this.prisma.followUp.count({
          where: {
            assignedToId: user.id,
            status: FollowUpStatus.COMPLETED,
            completedAt: { gte: startOfToday, lte: endOfToday },
          },
        }),
      ]);

    // Sanitize leads for salesperson
    const formattedData = followUps.map((f) => ({
      ...f,
      lead: user.role === RoleType.SALESPERSON ? sanitizeLeadForSalesperson(f.lead) : f.lead,
    }));

    return {
      data: formattedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        dueTodayCount,
        overdueCount,
        completedTodayCount,
      },
    };
  }

  /**
   * Retrieves follow-up schedule for a specific lead
   */
  async getFollowUpsForLead(leadId: string, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, leadCode: true, assignedToId: true },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    if (user.role === RoleType.SALESPERSON && lead.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only view follow-ups for your assigned leads',
      );
    }

    return this.prisma.followUp.findMany({
      where: { leadId },
      orderBy: { scheduledTime: 'desc' },
      include: {
        assignedTo: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Manually mark a follow-up as completed
   */
  async completeFollowUp(id: string, user: AuthenticatedUser) {
    const followUp = await this.prisma.followUp.findUnique({
      where: { id },
    });

    if (!followUp) {
      throw new NotFoundException(`Follow-up with ID ${id} not found`);
    }

    if (user.role === RoleType.SALESPERSON && followUp.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only complete your own scheduled follow-ups',
      );
    }

    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Cancel an existing follow-up
   */
  async cancelFollowUp(id: string, reason: string | undefined, user: AuthenticatedUser) {
    const followUp = await this.prisma.followUp.findUnique({
      where: { id },
    });

    if (!followUp) {
      throw new NotFoundException(`Follow-up with ID ${id} not found`);
    }

    if (user.role === RoleType.SALESPERSON && followUp.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only cancel your own scheduled follow-ups',
      );
    }

    return this.prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.CANCELLED,
        reminderNotes: reason
          ? `${followUp.reminderNotes || ''} [Cancelled: ${reason}]`.trim()
          : followUp.reminderNotes,
      },
    });
  }

  /**
   * Reschedule an existing follow-up
   */
  async rescheduleFollowUp(
    id: string,
    dto: RescheduleFollowUpDto,
    user: AuthenticatedUser,
  ) {
    const followUp = await this.prisma.followUp.findUnique({
      where: { id },
    });

    if (!followUp) {
      throw new NotFoundException(`Follow-up with ID ${id} not found`);
    }

    if (user.role === RoleType.SALESPERSON && followUp.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only reschedule your own follow-ups',
      );
    }

    const scheduledDate = new Date(dto.scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid reschedule timestamp format');
    }

    return this.prisma.followUp.update({
      where: { id },
      data: {
        scheduledTime: scheduledDate,
        status: FollowUpStatus.SCHEDULED,
        reminderNotes: dto.reason
          ? `${followUp.reminderNotes || ''} [Rescheduled: ${dto.reason}]`.trim()
          : followUp.reminderNotes,
      },
    });
  }
}
