import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DecideApprovalDto, SendBackTarget } from './dto/decide-approval.dto';
import { ApprovalQueueQueryDto, ApprovalQueueFilter } from './dto/approval-queue-query.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApprovalDecision, LeadStatus, RoleType } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the centralized Approval Queue for medical advisors & commercial heads.
   */
  async getQueue(query: ApprovalQueueQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    const filter = query.filter || ApprovalQueueFilter.ALL_ACTIVE;

    if (filter === ApprovalQueueFilter.ALL_ACTIVE) {
      where.decision = null;
    } else if (filter === ApprovalQueueFilter.PENDING) {
      where.decision = null;
      where.officerId = null;
    } else if (filter === ApprovalQueueFilter.CLAIMED) {
      where.decision = null;
      where.officerId = { not: null };
    } else if (filter === ApprovalQueueFilter.DECIDED) {
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

    const [total, requests] = await Promise.all([
      this.prisma.approvalRequest.count({ where }),
      this.prisma.approvalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // FIFO: oldest forwarded to approval first
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
              pendingReviews: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  reason: true,
                  decision: true,
                  reviewerNotes: true,
                  createdAt: true,
                },
              },
            },
          },
          officer: {
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

    return {
      data: requests,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Claim an approval request to lock it and prevent concurrent audit collisions
   */
  async claimApproval(id: string, user: AuthenticatedUser) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        officer: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        lead: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID ${id} not found`);
    }

    if (request.decision !== null) {
      throw new BadRequestException('Cannot claim an approval request that has already been decided');
    }

    // Collision check
    if (
      request.officerId &&
      request.officerId !== user.id &&
      user.role !== RoleType.SUPER_ADMIN
    ) {
      throw new ConflictException(
        `This approval request is already claimed by officer ${request.officer?.employeeCode} (${request.officer?.firstName})`,
      );
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: { officerId: user.id },
      include: {
        officer: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Approval request ${id} for lead ${request.lead.leadCode} claimed by ${user.employeeCode}`,
    );

    return updated;
  }

  /**
   * Final sign-off decision engine:
   * 1. APPROVE: Lead -> APPROVED (Unlocks "Convert to Customer" in Panel 05)
   * 2. REJECT: Lead -> REJECTED (Permanent commercial/medical disqualification)
   * 3. SEND_BACK: Lead -> PENDING_REVIEW (or CONTACTED) for rectification
   */
  async decideApproval(
    id: string,
    dto: DecideApprovalDto,
    user: AuthenticatedUser,
  ) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID ${id} not found`);
    }

    if (request.decision !== null) {
      throw new ConflictException(
        `Approval request ${id} has already been resolved with decision ${request.decision}`,
      );
    }

    let nextLeadStatus: LeadStatus;
    if (dto.decision === ApprovalDecision.APPROVE) {
      nextLeadStatus = LeadStatus.APPROVED;
    } else if (dto.decision === ApprovalDecision.REJECT) {
      nextLeadStatus = LeadStatus.REJECTED;
    } else {
      // SEND_BACK
      nextLeadStatus =
        dto.sendBackTarget === SendBackTarget.SALESPERSON
          ? LeadStatus.CONTACTED
          : LeadStatus.PENDING_REVIEW;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update ApprovalRequest
      const decidedRequest = await tx.approvalRequest.update({
        where: { id },
        data: {
          decision: dto.decision,
          decisionReason:
            dto.decisionReason ||
            (dto.decision === ApprovalDecision.APPROVE
              ? 'MEDICAL_AND_COMMERCIAL_VERIFIED'
              : 'REJECTED_BY_OFFICER'),
          officerNotes: dto.officerNotes.trim(),
          decidedAt: new Date(),
          officerId: request.officerId || user.id,
        },
        include: {
          officer: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      });

      // 2. Transition lead state
      await tx.lead.update({
        where: { id: request.leadId },
        data: { status: nextLeadStatus },
      });

      // 3. Log lead status transition
      await tx.leadStatusHistory.create({
        data: {
          leadId: request.leadId,
          fromStatus: request.lead.status,
          toStatus: nextLeadStatus,
          changedById: user.id,
          reason: `Approval Decision: ${dto.decision}${dto.decisionReason ? ` (${dto.decisionReason})` : ''} - ${dto.officerNotes.slice(0, 100)}`,
        },
      });

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'APPROVAL_REQUEST_DECIDED',
          entityType: 'ApprovalRequest',
          entityId: request.id,
          newState: {
            leadCode: request.lead.leadCode,
            decision: dto.decision,
            reason: dto.decisionReason,
            officerNotes: dto.officerNotes,
            nextStatus: nextLeadStatus,
            decidedBy: user.employeeCode,
          },
        },
      });

      this.logger.log(
        `Approval request ${id} decided: ${dto.decision}. Lead ${request.lead.leadCode} -> ${nextLeadStatus}`,
      );

      return {
        success: true,
        decision: dto.decision,
        nextLeadStatus,
        approvalRequest: decidedRequest,
      };
    });
  }

  /**
   * Retrieves full verification dossier for the approval authority
   */
  async getApprovalDossier(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        officer: {
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
            pendingReviews: {
              orderBy: { createdAt: 'desc' },
              include: {
                claimedBy: {
                  select: { id: true, employeeCode: true, firstName: true, lastName: true },
                },
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
            },
            statusHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID ${id} not found`);
    }

    return request;
  }

  /**
   * Retrieves approval history for a specific lead
   */
  async getApprovalsForLead(leadId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        officer: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Approval Dashboard KPIs
   */
  async getMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalRequests, newRequests, inReview, approvedToday, rejectedToday] =
      await Promise.all([
        this.prisma.approvalRequest.count({
          where: { decision: null },
        }),
        this.prisma.approvalRequest.count({
          where: { decision: null, officerId: null },
        }),
        this.prisma.approvalRequest.count({
          where: { decision: null, officerId: { not: null } },
        }),
        this.prisma.approvalRequest.count({
          where: { decision: ApprovalDecision.APPROVE, decidedAt: { gte: startOfToday } },
        }),
        this.prisma.approvalRequest.count({
          where: { decision: ApprovalDecision.REJECT, decidedAt: { gte: startOfToday } },
        }),
      ]);

    return {
      totalRequests,
      newRequests,
      inReview,
      approvedToday,
      rejectedToday,
    };
  }
}
