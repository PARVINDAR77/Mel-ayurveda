import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCallLogDto } from './dto/create-call-log.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CallOutcome, LeadStatus, RoleType, FollowUpStatus, PendingDecision } from '@prisma/client';

@Injectable()
export class CallingService {
  private readonly logger = new Logger(CallingService.name);

  // Outcome to Next Lead State mapping as specified in CALLING_WORKFLOW.md
  private readonly outcomeStatusMap: Record<CallOutcome, LeadStatus> = {
    [CallOutcome.INTERESTED]: LeadStatus.INTERESTED,
    [CallOutcome.NOT_INTERESTED]: LeadStatus.NOT_INTERESTED,
    [CallOutcome.NO_ANSWER]: LeadStatus.CONTACTED,
    [CallOutcome.BUSY_CALL_LATER]: LeadStatus.FOLLOW_UP_REQUIRED,
    [CallOutcome.INVALID_NUMBER]: LeadStatus.INVALID_NUMBER,
    [CallOutcome.FOLLOW_UP_REQUIRED]: LeadStatus.FOLLOW_UP_REQUIRED,
    [CallOutcome.PENDING_REVIEW]: LeadStatus.PENDING_REVIEW,
    [CallOutcome.REJECTED]: LeadStatus.REJECTED,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an immutable call attempt.
   * STRICT SECURITY RULES:
   * 1. Anti-IDOR: Tele-salespersons can ONLY log calls for leads assigned to them.
   * 2. Immutability: Call logs are strictly APPEND-ONLY (no edit or delete allowed).
   * 3. Automatic lead status transition & lastContactedAt timestamp update.
   * 4. Automatic completion of previous pending follow-ups for this lead.
   * 5. Optional follow-up scheduling in the same atomic transaction.
   * 6. Automatic routing:
   *    - If submitForApproval: routes to Panel 04 Approval Officer queue (APPROVAL_REQUESTED).
   *    - If pending / follow-up / not picked: routes to Panel 03 Pending Review queue (PENDING_REVIEW).
   */
  async createCallLog(dto: CreateCallLogDto, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
    }

    // STRICT INVARIANT: Salesperson can only log calls for leads assigned to them
    if (user.role === RoleType.SALESPERSON && lead.assignedToId !== user.id) {
      this.logger.warn(
        `IDOR Violation attempt: Salesperson ${user.id} (${user.employeeCode}) attempted to log call for lead ${lead.leadCode} owned by ${lead.assignedToId}`,
      );
      throw new ForbiddenException(
        'Access denied: You can only record calls for leads currently assigned to you',
      );
    }

    let nextStatus = dto.submitForApproval
      ? LeadStatus.APPROVAL_REQUESTED
      : this.outcomeStatusMap[dto.callOutcome];

    // Validate scheduled follow-up time if provided
    let scheduledDate: Date | null = null;
    if (dto.scheduledFollowUpTime) {
      scheduledDate = new Date(dto.scheduledFollowUpTime);
      if (isNaN(scheduledDate.getTime())) {
        throw new BadRequestException('Invalid scheduled follow-up date format');
      }
    } else if (
      dto.callOutcome === CallOutcome.BUSY_CALL_LATER ||
      dto.callOutcome === CallOutcome.FOLLOW_UP_REQUIRED
    ) {
      // Set a default reminder 24 hours out if not provided
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      scheduledDate = defaultDate;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create immutable call log entry
      const callLog = await tx.callLog.create({
        data: {
          leadId: lead.id,
          callerId: user.id,
          callOutcome: dto.callOutcome,
          durationSeconds: dto.durationSeconds ?? 0,
          notes: dto.notes,
        },
        include: {
          caller: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // 2. Update Lead status and lastContactedAt timestamp
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: nextStatus,
          lastContactedAt: new Date(),
        },
      });

      // 3. Record status transition history if status changed
      if (lead.status !== nextStatus) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: lead.id,
            fromStatus: lead.status,
            toStatus: nextStatus,
            changedById: user.id,
            reason: dto.submitForApproval
              ? 'Deal confirmed on call - submitted directly to final approval queue'
              : `Call outcome: ${dto.callOutcome}${dto.notes ? ` - ${dto.notes.slice(0, 100)}` : ''}`,
          },
        });
      }

      // 4. Auto-complete previous open follow-ups for this lead
      await tx.followUp.updateMany({
        where: {
          leadId: lead.id,
          status: { in: [FollowUpStatus.SCHEDULED, FollowUpStatus.OVERDUE] },
        },
        data: {
          status: FollowUpStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // 5. Schedule new follow-up if date is set
      let newFollowUp = null;
      if (scheduledDate) {
        newFollowUp = await tx.followUp.create({
          data: {
            leadId: lead.id,
            assignedToId: lead.assignedToId || user.id,
            scheduledTime: scheduledDate,
            reminderNotes: dto.followUpNotes || dto.notes || `Callback scheduled after ${dto.callOutcome}`,
            status: FollowUpStatus.SCHEDULED,
          },
        });
      }

      // 6. WORKFLOW ROUTING LOGIC:
      if (dto.submitForApproval) {
        // Create ApprovalRequest if not exists
        const existingReq = await tx.approvalRequest.findFirst({
          where: { leadId: lead.id, decision: null },
        });
        if (!existingReq) {
          await tx.approvalRequest.create({
            data: {
              leadId: lead.id,
            },
          });
        }

        // Close any pending review
        const activePending = await tx.pendingReview.findFirst({
          where: { leadId: lead.id, decision: null },
        });
        if (activePending) {
          await tx.pendingReview.update({
            where: { id: activePending.id },
            data: {
              decision: PendingDecision.APPROVE,
              reviewerNotes: dto.notes || 'Approved directly from sales consultation call',
              decidedAt: new Date(),
              claimedById: user.id,
            },
          });
        }
      } else if (
        dto.callOutcome === CallOutcome.PENDING_REVIEW ||
        dto.callOutcome === CallOutcome.FOLLOW_UP_REQUIRED ||
        dto.callOutcome === CallOutcome.BUSY_CALL_LATER ||
        dto.callOutcome === CallOutcome.NO_ANSWER
      ) {
        // Automatically create PendingReview record so it appears in Panel 03 Pending Review queue
        const existingPending = await tx.pendingReview.findFirst({
          where: { leadId: lead.id, decision: null },
        });
        if (!existingPending) {
          await tx.pendingReview.create({
            data: {
              leadId: lead.id,
              submittedById: user.id,
              reason: `Call outcome: ${dto.callOutcome}`,
              salesNotes: dto.notes || 'Pending follow-up / triage review',
            },
          });
        }
      }

      this.logger.log(
        `Call logged for lead ${lead.leadCode} by ${user.employeeCode}. Outcome: ${dto.callOutcome}. Next Status: ${nextStatus}`,
      );

      return {
        callLog,
        previousStatus: lead.status,
        newStatus: nextStatus,
        followUp: newFollowUp,
      };
    });
  }

  /**
   * Retrieves chronological call history for a lead.
   * Salespersons can only access call history for their assigned leads.
   */
  async getLogsForLead(leadId: string, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, leadCode: true, assignedToId: true },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    if (user.role === RoleType.SALESPERSON && lead.assignedToId !== user.id) {
      throw new ForbiddenException(
        'Access denied: You can only view call history for your assigned leads',
      );
    }

    return this.prisma.callLog.findMany({
      where: { leadId },
      orderBy: { calledAt: 'desc' },
      include: {
        caller: {
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
   * Generates personal call analytics and KPIs for the current employee
   */
  async getMyCallingAnalytics(user: AuthenticatedUser) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [todayCalls, weekCalls, allCalls] = await Promise.all([
      this.prisma.callLog.findMany({
        where: {
          callerId: user.id,
          calledAt: { gte: startOfToday },
        },
      }),
      this.prisma.callLog.findMany({
        where: {
          callerId: user.id,
          calledAt: { gte: startOfWeek },
        },
      }),
      this.prisma.callLog.findMany({
        where: {
          callerId: user.id,
        },
      }),
    ]);

    const totalSecondsToday = todayCalls.reduce((acc, c) => acc + c.durationSeconds, 0);
    const totalSecondsAll = allCalls.reduce((acc, c) => acc + c.durationSeconds, 0);

    const breakdownByOutcome: Record<string, number> = {};
    for (const outcome of Object.values(CallOutcome)) {
      breakdownByOutcome[outcome] = 0;
    }
    for (const call of allCalls) {
      breakdownByOutcome[call.callOutcome] = (breakdownByOutcome[call.callOutcome] || 0) + 1;
    }

    const interestedCount = breakdownByOutcome[CallOutcome.INTERESTED] || 0;
    const conversionRate =
      allCalls.length > 0
        ? Number(((interestedCount / allCalls.length) * 100).toFixed(1))
        : 0;

    return {
      caller: {
        id: user.id,
        employeeCode: user.employeeCode,
        name: `${user.firstName} ${user.lastName}`,
      },
      today: {
        totalCalls: todayCalls.length,
        totalDurationSeconds: totalSecondsToday,
        averageDurationSeconds:
          todayCalls.length > 0 ? Math.round(totalSecondsToday / todayCalls.length) : 0,
      },
      last7Days: {
        totalCalls: weekCalls.length,
      },
      overall: {
        totalCalls: allCalls.length,
        totalDurationSeconds: totalSecondsAll,
        averageDurationSeconds:
          allCalls.length > 0 ? Math.round(totalSecondsAll / allCalls.length) : 0,
        interestedCount,
        conversionRate,
        breakdownByOutcome,
      },
    };
  }
}
