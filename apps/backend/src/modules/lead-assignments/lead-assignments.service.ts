import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RoleType, LeadStatus, NotificationType } from '@prisma/client';
import { AssignLeadDto, BulkAssignDto, ReassignLeadDto } from './dto/assign-lead.dto';

@Injectable()
export class LeadAssignmentsService {
  private readonly logger = new Logger(LeadAssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Helper to validate that the target assignee exists, is active, and is a salesperson or admin.
   */
  private async validateAssignee(assigneeId: string) {
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    });

    if (!assignee) {
      throw new NotFoundException(`Assignee employee with ID ${assigneeId} not found`);
    }
    if (!assignee.isActive) {
      throw new BadRequestException(`Cannot assign to deactivated employee ${assignee.employeeCode}`);
    }
    if (assignee.role !== RoleType.SALESPERSON && assignee.role !== RoleType.SUPER_ADMIN) {
      throw new BadRequestException('Leads can only be assigned to Salespersons or Administrators');
    }

    return assignee;
  }

  /**
   * Assigns a single lead with transaction and audit trail
   */
  async assignLead(dto: AssignLeadDto, actorId: string) {
    const targetAssigneeId = dto.assignedToId || dto.salespersonId;
    if (!targetAssigneeId) {
      throw new BadRequestException('assignedToId or salespersonId is required');
    }
    const assignee = await this.validateAssignee(targetAssigneeId);

    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${dto.leadId} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Deactivate previous active assignments for this lead
      await tx.leadAssignment.updateMany({
        where: { leadId: dto.leadId, isActive: true },
        data: { isActive: false },
      });

      // Insert new assignment record
      const assignment = await tx.leadAssignment.create({
        data: {
          leadId: dto.leadId,
          assignedById: actorId,
          assignedToId: targetAssigneeId,
          reassignmentReason: dto.reason || 'Manual single assignment',
          isActive: true,
        },
      });

      // Update lead status to ASSIGNED if it was NEW
      const newStatus = lead.status === LeadStatus.NEW ? LeadStatus.ASSIGNED : lead.status;

      const updatedLead = await tx.lead.update({
        where: { id: dto.leadId },
        data: {
          assignedToId: targetAssigneeId,
          assignedAt: new Date(),
          status: newStatus,
        },
        include: {
          assignedTo: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      });

      // Status history if transition occurred
      if (lead.status !== newStatus) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: lead.id,
            fromStatus: lead.status,
            toStatus: newStatus,
            changedById: actorId,
            reason: dto.reason || 'Lead assigned to salesperson',
          },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'LEAD_ASSIGNED',
          entityType: 'Lead',
          entityId: lead.id,
          newState: {
            assignedTo: assignee.employeeCode,
            status: newStatus,
            reason: dto.reason,
          },
        },
      });

      return { lead: updatedLead, assignment };
    });

    this.logger.log(`Lead ${lead.leadCode} assigned to ${assignee.employeeCode} by admin ${actorId}`);

    // Dispatch real-time live notification to the assigned salesperson
    try {
      await this.notificationsService.createNotification({
        userId: targetAssigneeId,
        title: 'New Lead Assigned',
        message: `Lead ${lead.leadCode} (${lead.customerName}) has been assigned to your calling queue.`,
        type: NotificationType.LEAD_ASSIGNED,
        link: '/sales/leads',
      });
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch lead assignment notification: ${notifErr}`);
    }

    return updated;
  }

  /**
   * Bulk lead assignment across multiple leads in an atomic transaction
   */
  async bulkAssign(dto: BulkAssignDto, actorId: string) {
    if (!dto.leadIds || dto.leadIds.length === 0) {
      throw new BadRequestException('leadIds array cannot be empty');
    }

    const targetAssigneeId = dto.assignedToId || dto.salespersonId;
    if (!targetAssigneeId) {
      throw new BadRequestException('assignedToId or salespersonId is required');
    }
    const assignee = await this.validateAssignee(targetAssigneeId);

    const result = await this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (const leadId of dto.leadIds) {
        // Deactivate old assignment
        await tx.leadAssignment.updateMany({
          where: { leadId, isActive: true },
          data: { isActive: false },
        });

        // Insert new assignment
        await tx.leadAssignment.create({
          data: {
            leadId,
            assignedById: actorId,
            assignedToId: targetAssigneeId,
            reassignmentReason: dto.reason || 'Bulk manual assignment',
            isActive: true,
          },
        });

        // Update lead
        await tx.lead.update({
          where: { id: leadId },
          data: {
            assignedToId: targetAssigneeId,
            assignedAt: new Date(),
            status: LeadStatus.ASSIGNED,
          },
        });

        count++;
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'LEADS_BULK_ASSIGNED',
          entityType: 'Lead',
          entityId: 'BULK',
          newState: {
            assignedCount: count,
            assignedTo: assignee.employeeCode,
            reason: dto.reason,
          },
        },
      });

      return count;
    });

    this.logger.log(`Bulk assigned ${result} leads to ${assignee.employeeCode} by admin ${actorId}`);

    // Dispatch real-time live notification
    try {
      await this.notificationsService.createNotification({
        userId: targetAssigneeId,
        title: `${result} Leads Assigned`,
        message: `${result} leads have been allocated to your priority calling queue.`,
        type: NotificationType.LEAD_ASSIGNED,
        link: '/sales/leads',
      });
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch bulk assignment notification: ${notifErr}`);
    }

    return {
      success: true,
      assignedCount: result,
      assignedTo: {
        id: assignee.id,
        employeeCode: assignee.employeeCode,
        firstName: assignee.firstName,
        lastName: assignee.lastName,
      },
    };
  }

  /**
   * Reassign a lead with mandatory audit reason
   */
  async reassignLead(dto: ReassignLeadDto, actorId: string) {
    return this.assignLead(
      {
        leadId: dto.leadId,
        assignedToId: dto.newAssignedToId,
        reason: `REASSIGNMENT: ${dto.reason}`,
      },
      actorId,
    );
  }

  /**
   * Automated round-robin distribution of unassigned leads among active salespeople
   */
  async distributeRoundRobin(actorId: string) {
    // 1. Find all unassigned leads
    const unassignedLeads = await this.prisma.lead.findMany({
      where: {
        status: LeadStatus.NEW,
        assignedToId: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (unassignedLeads.length === 0) {
      return {
        success: true,
        message: 'No unassigned leads found in the intake queue.',
        distributedCount: 0,
      };
    }

    // 2. Find all active salespeople currently accepting leads
    const salespeople = await this.prisma.user.findMany({
      where: {
        role: RoleType.SALESPERSON,
        isActive: true,
        isAcceptingLeads: true,
      },
      orderBy: { employeeCode: 'asc' },
    });

    if (salespeople.length === 0) {
      throw new BadRequestException('No active salespeople are currently available to receive leads');
    }

    // 3. Atomically distribute leads in round-robin fashion
    const assignmentsResult = await this.prisma.$transaction(async (tx) => {
      const distributed: Array<{ leadCode: string; assignedTo: string }> = [];

      for (let i = 0; i < unassignedLeads.length; i++) {
        const lead = unassignedLeads[i];
        const salesperson = salespeople[i % salespeople.length];

        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedById: actorId,
            assignedToId: salesperson.id,
            reassignmentReason: 'Automated Round-Robin distribution',
            isActive: true,
          },
        });

        await tx.lead.update({
          where: { id: lead.id },
          data: {
            assignedToId: salesperson.id,
            assignedAt: new Date(),
            status: LeadStatus.ASSIGNED,
          },
        });

        await tx.leadStatusHistory.create({
          data: {
            leadId: lead.id,
            fromStatus: LeadStatus.NEW,
            toStatus: LeadStatus.ASSIGNED,
            changedById: actorId,
            reason: 'Automated round-robin distribution',
          },
        });

        distributed.push({
          leadCode: lead.leadCode,
          assignedTo: salesperson.employeeCode,
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'LEADS_ROUND_ROBIN_DISTRIBUTED',
          entityType: 'Lead',
          entityId: 'ROUND_ROBIN',
          newState: { totalDistributed: distributed.length },
        },
      });

      return distributed;
    });

    this.logger.log(`Round-robin distributed ${assignmentsResult.length} leads across ${salespeople.length} salespeople`);

    // Group distributed leads by assigned salesperson and notify each
    try {
      const countsByRep = new Map<string, number>();
      for (const a of assignmentsResult) {
        countsByRep.set(a.assignedTo, (countsByRep.get(a.assignedTo) || 0) + 1);
      }
      for (const sp of salespeople) {
        const assignedCount = countsByRep.get(sp.employeeCode);
        if (assignedCount && assignedCount > 0) {
          await this.notificationsService.createNotification({
            userId: sp.id,
            title: `${assignedCount} Leads Assigned`,
            message: `${assignedCount} fresh leads have been allocated to your queue via round-robin distribution.`,
            type: NotificationType.LEAD_ASSIGNED,
            link: '/sales/leads',
          });
        }
      }
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch round-robin notifications: ${notifErr}`);
    }

    return {
      success: true,
      distributedCount: assignmentsResult.length,
      assignments: assignmentsResult,
    };
  }

  /**
   * Retrieves chronological assignment audit history for a specific lead
   */
  async getAssignmentHistory(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, leadCode: true, customerName: true },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const history = await this.prisma.leadAssignment.findMany({
      where: { leadId },
      orderBy: { assignedAt: 'desc' },
      include: {
        assignedBy: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      lead,
      history,
    };
  }

  /**
   * Unassigned leads queue for Super Admin monitoring
   */
  async getUnassignedQueue() {
    return this.prisma.lead.findMany({
      where: {
        status: LeadStatus.NEW,
        assignedToId: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        leadCode: true,
        customerName: true,
        phoneNumber: true,
        city: true,
        state: true,
        productInterest: true,
        priority: true,
        createdAt: true,
      },
    });
  }
}
