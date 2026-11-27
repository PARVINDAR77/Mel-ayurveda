import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadPriority, LeadStatus, LeadSourceType, RoleType } from '@prisma/client';
import { CreateManualLeadDto, UpdateLeadDto } from './dto/create-manual-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { BulkImportLeadsDto } from './dto/bulk-import-leads.dto';
import { sanitizeLeadForSalesperson, formatLeadForAdmin } from './dto/lead-projections';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates sequential lead identifier: MEL-LEAD-000101, MEL-LEAD-000102, ...
   */
  async generateLeadCode(): Promise<string> {
    const prefix = 'MEL-LEAD-';
    const existing = await this.prisma.lead.findMany({
      where: { leadCode: { startsWith: prefix } },
      select: { leadCode: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let maxNumber = 100; // Baseline start
    for (const l of existing) {
      const numPart = l.leadCode.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Normalizes Indian phone number to canonical 10 digits
   */
  normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
  }

  /**
   * Deduplication Check: Look up active lead with same phone number within 30 days
   */
  async checkDuplicate(phone: string) {
    const normalized = this.normalizePhoneNumber(phone);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const existing = await this.prisma.lead.findFirst({
      where: {
        phoneNumber: normalized,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        assignedTo: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isDuplicate: !!existing,
      normalizedPhone: normalized,
      existingLead: existing
        ? {
            id: existing.id,
            leadCode: existing.leadCode,
            customerName: existing.customerName,
            status: existing.status,
            assignedTo: existing.assignedTo,
            createdAt: existing.createdAt,
          }
        : null,
    };
  }

  /**
   * Create Manual Lead with creator session attribution & deduplication check
   */
  async createManualLead(dto: CreateManualLeadDto, creatorId: string) {
    const normalizedPhone = this.normalizePhoneNumber(dto.phoneNumber);

    // Duplicate check
    const dupCheck = await this.checkDuplicate(normalizedPhone);
    if (dupCheck.isDuplicate && dupCheck.existingLead) {
      this.logger.warn(`Duplicate lead alert: ${normalizedPhone} already exists as ${dupCheck.existingLead.leadCode}`);
    }

    const leadCode = await this.generateLeadCode();
    let assignedToId: string | null = null;
    let assignedAt: Date | null = null;
    let initialStatus: LeadStatus = LeadStatus.NEW;

    // Check optional assignment
    if (dto.assignToEmployeeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignToEmployeeId },
      });

      if (!assignee) {
        throw new NotFoundException(`Assignee employee ID ${dto.assignToEmployeeId} not found`);
      }
      if (!assignee.isActive) {
        throw new BadRequestException('Cannot assign lead to a deactivated employee');
      }
      if (assignee.role !== RoleType.SALESPERSON && assignee.role !== RoleType.SUPER_ADMIN) {
        throw new BadRequestException('Leads can only be assigned to Salespersons or Administrators');
      }

      assignedToId = assignee.id;
      assignedAt = new Date();
      initialStatus = LeadStatus.ASSIGNED;
    } else {
      // If created by a salesperson, automatically assign to their desk
      const creator = await this.prisma.user.findUnique({ where: { id: creatorId } });
      if (creator && creator.role === RoleType.SALESPERSON) {
        assignedToId = creator.id;
        assignedAt = new Date();
        initialStatus = LeadStatus.ASSIGNED;
      }
    }

    // Resolve source type and source ID for Super Admin transparency
    let resolvedSourceType: LeadSourceType = LeadSourceType.MANUAL;
    let sourceId: string | null = null;

    if (dto.sourceType) {
      const upperSource = dto.sourceType.toUpperCase();
      if (upperSource.includes('FACEBOOK')) resolvedSourceType = LeadSourceType.FACEBOOK_ADS;
      else if (upperSource.includes('INSTAGRAM')) resolvedSourceType = LeadSourceType.INSTAGRAM_ADS;
      else if (upperSource.includes('GOOGLE')) resolvedSourceType = LeadSourceType.GOOGLE_ADS;
      else if (upperSource.includes('WHATSAPP')) resolvedSourceType = LeadSourceType.WHATSAPP;
      else if (upperSource.includes('WEBSITE')) resolvedSourceType = LeadSourceType.WEBSITE;
      else resolvedSourceType = LeadSourceType.MANUAL;

      const matchedSource = await this.prisma.leadSource.findFirst({
        where: { sourceType: resolvedSourceType },
      });
      if (matchedSource) {
        sourceId = matchedSource.id;
      }
    }

    // Database transaction to record lead, assignment history, and status change
    const newLead = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          leadCode,
          customerName: dto.customerName.trim(),
          phoneNumber: normalizedPhone,
          alternatePhone: dto.alternatePhone ? this.normalizePhoneNumber(dto.alternatePhone) : null,
          email: dto.email?.trim().toLowerCase(),
          state: dto.state?.trim(),
          city: dto.city?.trim(),
          address: dto.address?.trim(),
          productInterest: dto.productInterest?.trim(),
          customerRequirements: dto.customerRequirements?.trim(),
          notes: dto.notes?.trim(),
          priority: dto.priority || LeadPriority.NORMAL,
          status: initialStatus,
          sourceType: resolvedSourceType,
          sourceId,
          createdById: creatorId, // Guaranteed authenticated creator!
          assignedToId,
          assignedAt,
        },
        include: {
          assignedTo: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      });

      // If assigned immediately, record assignment history row
      if (assignedToId) {
        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedById: creatorId,
            assignedToId,
            reassignmentReason: 'Initial manual assignment upon intake',
            isActive: true,
          },
        });
      }

      // Record status history
      await tx.leadStatusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: LeadStatus.NEW,
          toStatus: initialStatus,
          changedById: creatorId,
          reason: 'Manual lead creation',
        },
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          userId: creatorId,
          action: 'LEAD_CREATED_MANUAL',
          entityType: 'Lead',
          entityId: lead.id,
          newState: { leadCode, customerName: lead.customerName, status: lead.status },
        },
      });

      return lead;
    });

    this.logger.log(`Manual Lead ${newLead.leadCode} created by user ${creatorId}. Status: ${newLead.status}`);
    return formatLeadForAdmin(newLead);
  }

  /**
   * Retrieves leads with strict role-based Lead Source Privacy
   */
  async findAll(query: LeadQueryDto, userRole: RoleType, currentUserId: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // STRICT INVARIANT: Salesperson can ONLY see their own assigned leads!
    if (userRole === RoleType.SALESPERSON) {
      where.assignedToId = currentUserId;
    } else if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    // Only Admin & Management can filter by sourceType
    if (query.sourceType && userRole !== RoleType.SALESPERSON) {
      where.sourceType = query.sourceType;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { customerName: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
        { city: { contains: s, mode: 'insensitive' } },
        { leadCode: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
          source: userRole !== RoleType.SALESPERSON,
          createdBy: userRole !== RoleType.SALESPERSON
            ? { select: { id: true, employeeCode: true, firstName: true, lastName: true } }
            : false,
          callLogs: {
            take: 3,
            orderBy: { calledAt: 'desc' },
          },
          followUps: {
            where: { status: 'SCHEDULED' },
            take: 1,
            orderBy: { scheduledTime: 'asc' },
          },
        },
      }),
    ]);

    // STRICT INVARIANT: Sanitize response for Salesperson (quarantine marketing sources)
    const formattedData = leads.map((lead) =>
      userRole === RoleType.SALESPERSON
        ? sanitizeLeadForSalesperson(lead)
        : formatLeadForAdmin(lead),
    );

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
   * Retrieves single lead by ID with strict Anti-IDOR ownership validation
   */
  async findById(id: string, userRole: RoleType, currentUserId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, phoneNumber: true },
        },
        source: userRole !== RoleType.SALESPERSON,
        createdBy: userRole !== RoleType.SALESPERSON
          ? { select: { id: true, employeeCode: true, firstName: true, lastName: true } }
          : false,
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
        pendingReviews: {
          orderBy: { createdAt: 'desc' },
        },
        approvalRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // STRICT INVARIANT (Anti-IDOR): Salesperson can only view their own assigned lead!
    if (userRole === RoleType.SALESPERSON && lead.assignedToId !== currentUserId) {
      this.logger.warn(
        `IDOR Violation attempt: Salesperson ${currentUserId} attempted to view lead ${lead.leadCode} owned by ${lead.assignedToId}`,
      );
      throw new ForbiddenException('Access denied: You are not authorized to view this lead');
    }

    // Quarantine lead source for Salesperson
    return userRole === RoleType.SALESPERSON
      ? sanitizeLeadForSalesperson(lead)
      : formatLeadForAdmin(lead);
  }

  /**
   * Updates permitted lead details
   */
  async updateLead(id: string, dto: UpdateLeadDto, userRole: RoleType, currentUserId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Salesperson can only update their own assigned lead
    if (userRole === RoleType.SALESPERSON && lead.assignedToId !== currentUserId) {
      throw new ForbiddenException('Access denied: You are not authorized to update this lead');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        customerName: dto.customerName?.trim(),
        alternatePhone: dto.alternatePhone ? this.normalizePhoneNumber(dto.alternatePhone) : undefined,
        email: dto.email?.trim().toLowerCase(),
        state: dto.state?.trim(),
        city: dto.city?.trim(),
        address: dto.address?.trim(),
        productInterest: dto.productInterest?.trim(),
        customerRequirements: dto.customerRequirements?.trim(),
        notes: dto.notes?.trim(),
        priority: dto.priority,
      },
    });

    return userRole === RoleType.SALESPERSON
      ? sanitizeLeadForSalesperson(updated)
      : formatLeadForAdmin(updated);
  }

  /**
   * Bulk import historical leads from Excel / CSV spreadsheet
   */
  async bulkImportLeads(dto: BulkImportLeadsDto, userRole: RoleType, currentUserId: string) {
    if (!dto.leads || dto.leads.length === 0) {
      return { success: true, count: 0, imported: 0, skipped: 0, errors: [] };
    }

    const allUsers = await this.prisma.user.findMany({
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dto.leads.length; i++) {
      const row = dto.leads[i];
      try {
        const rawPhone = String(row.mobile || '').replace(/[^0-9]/g, '');
        if (!rawPhone || rawPhone.length < 8) {
          skippedCount++;
          errors.push(`Row ${i + 1}: Missing or invalid mobile number (${row.mobile || 'empty'})`);
          continue;
        }

        const phoneDigits = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
        const formattedPhone = phoneDigits;

        // Check if lead with this phone already exists
        const existing = await this.prisma.lead.findFirst({
          where: {
            OR: [
              { phoneNumber: formattedPhone },
              { phoneNumber: `+91${formattedPhone}` },
              { phoneNumber: `91${formattedPhone}` },
            ],
          },
        });

        if (existing) {
          skippedCount++;
          errors.push(`Row ${i + 1}: Lead with phone ${formattedPhone} already exists (${existing.leadCode})`);
          continue;
        }

        // Resolve Assigned To
        let assignedToId: string | null = currentUserId;
        if (row.agent) {
          const agentQuery = String(row.agent).toLowerCase();
          const matchedUser = allUsers.find(
            (u) =>
              (u.employeeCode && agentQuery.includes(u.employeeCode.toLowerCase())) ||
              (u.firstName && agentQuery.includes(u.firstName.toLowerCase())) ||
              (u.lastName && agentQuery.includes(u.lastName.toLowerCase())),
          );
          if (matchedUser) {
            assignedToId = matchedUser.id;
          }
        }

        // Generate Lead Code
        const year = new Date().getFullYear();
        const count = await this.prisma.lead.count();
        const rand = Date.now().toString().slice(-4);
        const leadCode = row.leadCode?.trim() || `MEL-LEAD-${year}-${String(count + 1).padStart(5, '0')}-${rand}`;

        // Resolve Date
        let createdAt = new Date();
        if (row.date) {
          const dateStr = String(row.date).trim();
          const ddmmyyyy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
          if (ddmmyyyy) {
            createdAt = new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]), 12, 0, 0);
          } else {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              createdAt = parsed;
            }
          }
        }

        // Resolve Source Type
        let sourceType: LeadSourceType = LeadSourceType.MANUAL;
        const srcStr = String(row.sourceOfLead || '').toUpperCase();
        if (srcStr.includes('FACEBOOK')) sourceType = LeadSourceType.FACEBOOK_ADS;
        else if (srcStr.includes('INSTAGRAM')) sourceType = LeadSourceType.INSTAGRAM_ADS;
        else if (srcStr.includes('GOOGLE')) sourceType = LeadSourceType.GOOGLE_ADS;
        else if (srcStr.includes('WHATSAPP')) sourceType = LeadSourceType.WHATSAPP;
        else if (srcStr.includes('WEBSITE') || srcStr.includes('WEB')) sourceType = LeadSourceType.WEBSITE;
        else if (srcStr.includes('REFERRAL') || srcStr.includes('OTHER')) sourceType = LeadSourceType.OTHER;

        // Resolve Status
        let status: LeadStatus = LeadStatus.NEW;
        const stStr = String(row.status || '').toUpperCase();
        if (stStr.includes('CONVERT')) status = LeadStatus.CONVERTED;
        else if (stStr.includes('INTEREST')) status = LeadStatus.INTERESTED;
        else if (stStr.includes('CONTACT') || stStr.includes('PROGRESS')) status = LeadStatus.CONTACTED;
        else if (stStr.includes('LOST') || stStr.includes('REJECT') || stStr.includes('NOT')) status = LeadStatus.NOT_INTERESTED;

        await this.prisma.lead.create({
          data: {
            leadCode,
            customerName: (row.customerName || 'Inbound Prospect').trim(),
            phoneNumber: formattedPhone,
            alternatePhone: row.alternateMobile ? String(row.alternateMobile).trim() : null,
            address: row.address ? String(row.address).trim() : null,
            city: row.city ? String(row.city).trim() : null,
            state: row.state ? String(row.state).trim() : null,
            productInterest: row.productInterest || row.disease || 'General Wellness',
            customerRequirements: row.disease ? `Target condition: ${row.disease}` : null,
            sourceType,
            status,
            assignedToId,
            createdAt,
          },
        });

        importedCount++;
      } catch (err: any) {
        skippedCount++;
        errors.push(`Row ${i + 1}: ${err.message || 'Error importing lead'}`);
      }
    }

    return {
      success: true,
      total: dto.leads.length,
      imported: importedCount,
      skipped: skippedCount,
      errors: errors.slice(0, 10),
    };
  }
}
