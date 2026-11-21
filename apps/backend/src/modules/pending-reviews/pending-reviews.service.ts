import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitPendingReviewDto } from './dto/submit-pending-review.dto';
import { DecidePendingReviewDto } from './dto/decide-pending-review.dto';
import { PendingQueueQueryDto, PendingQueueFilter } from './dto/pending-queue-query.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { LeadStatus, PendingDecision, RoleType, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PendingReviewsService {
  private readonly logger = new Logger(PendingReviewsService.name);

  // Decision to Next Lead State mapping as specified in PENDING_WORKFLOW.md
  private readonly decisionStatusMap: Record<PendingDecision, LeadStatus> = {
    [PendingDecision.APPROVE]: LeadStatus.APPROVAL_REQUESTED,
    [PendingDecision.REJECT]: LeadStatus.REJECTED,
    [PendingDecision.REQUEST_FOLLOW_UP]: LeadStatus.FOLLOW_UP_REQUIRED,
    [PendingDecision.SEND_BACK]: LeadStatus.CONTACTED,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Submit an active lead into the Pending Review queue for clinical & commercial audit.
   * ANTI-IDOR: Tele-salespersons can only submit leads currently assigned to them.
   */
  async submitPendingReview(dto: SubmitPendingReviewDto, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
    }

    // STRICT INVARIANT: Salesperson can only submit their own assigned lead
    if (user.role === RoleType.SALESPERSON && lead.assignedToId !== user.id) {
      this.logger.warn(
        `IDOR Violation attempt: Salesperson ${user.employeeCode} attempted to submit unassigned lead ${lead.leadCode} to pending`,
      );
      throw new ForbiddenException(
        'Access denied: You can only submit leads assigned to you for review',
      );
    }

    // Prevent submission of finalized leads
    if (
      lead.status === LeadStatus.APPROVED ||
      lead.status === LeadStatus.REJECTED ||
      lead.status === LeadStatus.CONVERTED
    ) {
      throw new BadRequestException(
        `Cannot submit lead with status ${lead.status} to pending review`,
      );
    }

    // Check if lead is already in an undecided pending review
    const existingActive = await this.prisma.pendingReview.findFirst({
      where: { leadId: lead.id, decision: null },
    });

    if (existingActive) {
      throw new ConflictException(
        'This lead is already queued for pending review',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create PendingReview record
      const review = await tx.pendingReview.create({
        data: {
          leadId: lead.id,
          submittedById: user.id,
          reason: dto.reason.trim(),
          salesNotes: dto.salesNotes?.trim(),
        },
      });

      // 2. Transition lead status to PENDING_REVIEW
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.PENDING_REVIEW },
      });

      // 3. Log lead status transition
      await tx.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: LeadStatus.PENDING_REVIEW,
          changedById: user.id,
          reason: `Submitted to Pending Review: ${dto.reason}`,
        },
      });

      // 4. Record audit trail
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PENDING_REVIEW_SUBMITTED',
          entityType: 'PendingReview',
          entityId: review.id,
          newState: {
            leadCode: lead.leadCode,
            reason: dto.reason,
            submittedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Lead ${lead.leadCode} submitted to Pending Review by ${user.employeeCode}. Reason: ${dto.reason}`,
      );

      return {
        success: true,
        review,
        leadStatus: LeadStatus.PENDING_REVIEW,
      };
    });

    // Dispatch real-time live notification to Clinical Reviewers & Super Admin
    try {
      await this.notificationsService.dispatchToRole(
        [RoleType.PENDING_REVIEWER, RoleType.SUPER_ADMIN],
        {
          title: 'Clinical Review Requested',
          message: `Lead ${lead.leadCode} (${lead.customerName}) submitted for triage: ${dto.reason}`,
          type: NotificationType.REVIEW_REQUESTED,
          link: '/pending/queue',
        },
      );
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch review notification: ${notifErr}`);
    }

    return result;
  }

  /**
   * Retrieves the centralized pending review queue with filtering and pagination
   */
  async getQueue(query: PendingQueueQueryDto) {
    // Auto-sync any leads in PENDING_REVIEW or FOLLOW_UP_REQUIRED that do not yet have an active PendingReview entry
    try {
      const pendingLeadsWithoutReview = await this.prisma.lead.findMany({
        where: {
          status: { in: [LeadStatus.PENDING_REVIEW, LeadStatus.FOLLOW_UP_REQUIRED] },
          pendingReviews: {
            none: { decision: null },
          },
        },
        select: {
          id: true,
          assignedToId: true,
          createdById: true,
          notes: true,
          status: true,
        },
      });

      for (const pl of pendingLeadsWithoutReview) {
        const submitterId = pl.assignedToId || pl.createdById;
        if (submitterId) {
          await this.prisma.pendingReview.create({
            data: {
              leadId: pl.id,
              submittedById: submitterId,
              reason: pl.status === LeadStatus.FOLLOW_UP_REQUIRED
                ? 'Follow-up consultation required'
                : 'Customer consultation triage review',
              salesNotes: pl.notes || 'Pending consultation review',
            },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Auto-sync pending leads error: ${e}`);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    const filter = query.filter || PendingQueueFilter.ALL_ACTIVE;
    if (filter === PendingQueueFilter.ALL_ACTIVE) {
      where.decision = null;
    } else if (filter === PendingQueueFilter.UNCLAIMED) {
      where.decision = null;
      where.claimedById = null;
    } else if (filter === PendingQueueFilter.CLAIMED) {
      where.decision = null;
      where.claimedById = { not: null };
    } else if (filter === PendingQueueFilter.DECIDED) {
      where.decision = { not: null };
    }

    if (query.search) {
      const s = query.search.trim();
      where.lead = {
        OR: [
          { customerName: { contains: s, mode: 'insensitive' } },
          { phoneNumber: { contains: s } },
          { leadCode: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const [total, reviews] = await Promise.all([
      this.prisma.pendingReview.count({ where }),
      this.prisma.pendingReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // FIFO - oldest pending review first
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
              assignedTo: {
                select: {
                  id: true,
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          claimedBy: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    // Attach submitting salesperson info for each review
    const submitterIds = [...new Set(reviews.map((r) => r.submittedById))];
    const submitters = await this.prisma.user.findMany({
      where: { id: { in: submitterIds } },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
    });
    const submitterMap = new Map(submitters.map((s) => [s.id, s]));

    const formattedData = reviews.map((r) => ({
      ...r,
      submittedBy: submitterMap.get(r.submittedById) || null,
    }));

    return {
      data: formattedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Claim a pending review to lock it and prevent concurrent audit collisions
   */
  async claimReview(reviewId: string, user: AuthenticatedUser) {
    const review = await this.prisma.pendingReview.findUnique({
      where: { id: reviewId },
      include: {
        lead: true,
        claimedBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Pending review with ID ${reviewId} not found`);
    }

    if (review.decision !== null) {
      throw new BadRequestException('Cannot claim a review that has already been decided');
    }

    // Collision check: Already claimed by another reviewer
    if (
      review.claimedById &&
      review.claimedById !== user.id &&
      user.role !== RoleType.SUPER_ADMIN
    ) {
      throw new ConflictException(
        `This review is already locked by reviewer ${review.claimedBy?.employeeCode} (${review.claimedBy?.firstName})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock review with claiming reviewer
      const updatedReview = await tx.pendingReview.update({
        where: { id: reviewId },
        data: { claimedById: user.id },
        include: {
          claimedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      });

      // 2. Update lead status to UNDER_REVIEW
      await tx.lead.update({
        where: { id: review.leadId },
        data: { status: LeadStatus.UNDER_REVIEW },
      });

      // 3. Log lead status change
      await tx.leadStatusHistory.create({
        data: {
          leadId: review.leadId,
          fromStatus: review.lead.status,
          toStatus: LeadStatus.UNDER_REVIEW,
          changedById: user.id,
          reason: `Audit review claimed by ${user.employeeCode}`,
        },
      });

      this.logger.log(
        `Review ${reviewId} for lead ${review.lead.leadCode} claimed by ${user.employeeCode}`,
      );

      return updatedReview;
    });
  }

  /**
   * Execute one of the 4 audited pending decisions:
   * 1. APPROVE -> Forward to Approval Authority (APPROVAL_REQUESTED) & create ApprovalRequest
   * 2. REJECT -> Disqualify lead (REJECTED)
   * 3. REQUEST_FOLLOW_UP -> Return with clinical guidance (FOLLOW_UP_REQUIRED)
   * 4. SEND_BACK -> Return to salesperson active workspace (CONTACTED)
   */
  async decideReview(
    reviewId: string,
    dto: DecidePendingReviewDto,
    user: AuthenticatedUser,
  ) {
    const review = await this.prisma.pendingReview.findUnique({
      where: { id: reviewId },
      include: { lead: true },
    });

    if (!review) {
      throw new NotFoundException(`Pending review with ID ${reviewId} not found`);
    }

    if (review.decision !== null) {
      throw new ConflictException(
        `Review ${reviewId} has already been resolved with decision ${review.decision}`,
      );
    }

    const nextLeadStatus = this.decisionStatusMap[dto.decision];

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update PendingReview record with resolution and notes
      const decidedReview = await tx.pendingReview.update({
        where: { id: reviewId },
        data: {
          decision: dto.decision,
          reviewerNotes: dto.reviewerNotes.trim(),
          decidedAt: new Date(),
          claimedById: review.claimedById || user.id,
        },
        include: {
          claimedBy: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      });

      // 2. Transition lead state
      await tx.lead.update({
        where: { id: review.leadId },
        data: { status: nextLeadStatus },
      });

      // 3. If APPROVE: Forward to Panel 04 Approval Queue by generating ApprovalRequest
      let approvalRequest = null;
      if (dto.decision === PendingDecision.APPROVE) {
        const existingReq = await tx.approvalRequest.findFirst({
          where: { leadId: review.leadId, decision: null },
        });

        if (!existingReq) {
          approvalRequest = await tx.approvalRequest.create({
            data: {
              leadId: review.leadId,
            },
          });
        } else {
          approvalRequest = existingReq;
        }
      }

      // 4. Log status history
      await tx.leadStatusHistory.create({
        data: {
          leadId: review.leadId,
          fromStatus: review.lead.status,
          toStatus: nextLeadStatus,
          changedById: user.id,
          reason: `Pending Review: ${dto.decision} - ${dto.reviewerNotes.slice(0, 100)}`,
        },
      });

      // 5. Record immutable audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PENDING_REVIEW_DECIDED',
          entityType: 'PendingReview',
          entityId: review.id,
          newState: {
            leadCode: review.lead.leadCode,
            decision: dto.decision,
            reviewerNotes: dto.reviewerNotes,
            nextStatus: nextLeadStatus,
            decidedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Review ${reviewId} decided: ${dto.decision}. Lead ${review.lead.leadCode} -> ${nextLeadStatus}`,
      );

      return {
        success: true,
        decision: dto.decision,
        nextLeadStatus,
        review: decidedReview,
        approvalRequest,
      };
    });

    // Dispatch real-time live notifications based on review decision
    try {
      if (dto.decision === PendingDecision.APPROVE) {
        // 1. Notify Final Approval Officers and Super Admin
        await this.notificationsService.dispatchToRole(
          [RoleType.APPROVAL_OFFICER, RoleType.SUPER_ADMIN],
          {
            title: 'Lead Approved for Sign-Off',
            message: `Lead ${review.lead.leadCode} (${review.lead.customerName}) verified in triage and forwarded to final clearance.`,
            type: NotificationType.APPROVAL_GRANTED,
            link: '/approval/queue',
          },
        );

        // 2. Notify assigned salesperson
        if (review.lead.assignedToId) {
          await this.notificationsService.createNotification({
            userId: review.lead.assignedToId,
            title: 'Clinical Review Approved',
            message: `Lead ${review.lead.leadCode} passed clinical triage and forwarded to final medical clearance.`,
            type: NotificationType.SUCCESS,
            link: '/sales/leads',
          });
        }
      } else {
        // Disqualified, returned, or follow-up required
        if (review.lead.assignedToId) {
          await this.notificationsService.createNotification({
            userId: review.lead.assignedToId,
            title: `Review Decision: ${dto.decision.replace('_', ' ')}`,
            message: `Lead ${review.lead.leadCode} returned with reviewer notes: ${dto.reviewerNotes}`,
            type: NotificationType.WARNING,
            link: '/sales/leads',
          });
        }
      }
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch review decision notifications: ${notifErr}`);
    }

    return result;
  }

  /**
   * Retrieves the comprehensive clinical audit dossier for a pending review
   */
  async getReviewDossier(reviewId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reviewId)) {
      throw new NotFoundException(`Invalid review ID format: ${reviewId}`);
    }

    const review = await this.prisma.pendingReview.findUnique({
      where: { id: reviewId },
      include: {
        claimedBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        lead: {
          include: {
            assignedTo: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            callLogs: {
              orderBy: { calledAt: 'desc' },
              include: {
                caller: {
                  select: { id: true, employeeCode: true, firstName: true, lastName: true },
                },
              },
            },
            followUps: {
              orderBy: { scheduledTime: 'desc' },
              include: {
                assignedTo: {
                  select: { id: true, employeeCode: true, firstName: true, lastName: true },
                },
              },
            },
            statusHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Pending review with ID ${reviewId} not found`);
    }

    const submitter = await this.prisma.user.findUnique({
      where: { id: review.submittedById },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });

    return {
      ...review,
      submittedBy: submitter,
    };
  }

  /**
   * Retrieves review history for a specific lead
   */
  async getReviewsForLead(leadId: string) {
    return this.prisma.pendingReview.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        claimedBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Pending Dashboard KPIs:
   * Total Pending, Overdue Reviews (>24h SLA), In Review, and Completed Today
   */
  async getMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const slaThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const [totalPending, unclaimedCount, inReviewCount, overdueCount, completedTodayCount] =
      await Promise.all([
        this.prisma.pendingReview.count({
          where: { decision: null },
        }),
        this.prisma.pendingReview.count({
          where: { decision: null, claimedById: null },
        }),
        this.prisma.pendingReview.count({
          where: { decision: null, claimedById: { not: null } },
        }),
        this.prisma.pendingReview.count({
          where: { decision: null, createdAt: { lt: slaThreshold } },
        }),
        this.prisma.pendingReview.count({
          where: { decidedAt: { gte: startOfToday } },
        }),
      ]);

    return {
      totalPending,
      unclaimedCount,
      inReviewCount,
      overdueCount,
      completedTodayCount,
    };
  }
}
