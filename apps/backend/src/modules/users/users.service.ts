import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType, User, NotificationType, LeadStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RecycleBinService } from '../recycle-bin/recycle-bin.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { hashPassword } from '../../common/utils/password.util';

const ROLE_CODE_PREFIX_MAP: Record<RoleType, string> = {
  [RoleType.SUPER_ADMIN]: 'MEL-ADM-',
  [RoleType.SALESPERSON]: 'MEL-SAL-',
  [RoleType.PENDING_REVIEWER]: 'MEL-PND-',
  [RoleType.APPROVAL_OFFICER]: 'MEL-APR-',
  [RoleType.MANAGEMENT]: 'MEL-MGT-',
  [RoleType.FOLLOWUP_EXECUTIVE]: 'MEL-FLW-',
  [RoleType.BILLING_EXECUTIVE]: 'MEL-BIL-',
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly recycleBinService: RecycleBinService,
  ) { }

  /**
   * Generates the next sequential unique employee identifier for a role.
   * e.g. MEL-SAL-001, MEL-SAL-002, MEL-ADM-002
   */
  async generateEmployeeCode(role: RoleType): Promise<string> {
    const prefix = ROLE_CODE_PREFIX_MAP[role] || 'MEL-EMP-';

    // Retrieve all employee codes matching this prefix to find the max sequential counter
    const existing = await this.prisma.user.findMany({
      where: {
        employeeCode: {
          startsWith: prefix,
        },
      },
      select: { employeeCode: true },
    });

    let maxNumber = 0;
    for (const u of existing) {
      const numPart = u.employeeCode.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }

    const nextNumber = maxNumber + 1;
    const formatted = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    return formatted;
  }

  /**
   * Creates a new employee with an auto-generated unique ID and Argon2id password
   */
  async createEmployee(dto: CreateEmployeeDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`An employee with email ${email} already exists`);
    }

    // Auto-generate next unique employee code
    const employeeCode = await this.generateEmployeeCode(dto.role);

    // Initial password
    const rawPassword = dto.initialPassword || dto.password || 'Melayurveda@2026';
    const passwordHash = await hashPassword(rawPassword);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          employeeCode,
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phoneNumber: dto.phoneNumber.trim(),
          role: dto.role,
          isActive: true,
          isAcceptingLeads: dto.isAcceptingLeads ?? true,
        },
        select: {
          id: true,
          employeeCode: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          isAcceptingLeads: true,
          createdAt: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'EMPLOYEE_CREATED',
          entityType: 'User',
          entityId: user.id,
          newState: user as any,
        },
      });

      return user;
    });

    this.logger.log(`Created new employee ${newUser.employeeCode} (${newUser.role}) by admin ${actorId}`);

    // Dispatch real-time live notification to Super Admin
    try {
      await this.notificationsService.dispatchToRole([RoleType.SUPER_ADMIN], {
        title: 'New Staff Registered',
        message: `${newUser.employeeCode} (${newUser.firstName} ${newUser.lastName}) onboarded as ${newUser.role.replace('_', ' ')}.`,
        type: NotificationType.INFO,
        link: '/admin/employees',
      });
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch employee creation notification: ${notifErr}`);
    }

    return newUser;
  }

  /**
   * Retrieves paginated employee list with search and role filters
   */
  async findAll(query: EmployeeQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.isActive !== undefined) {
      where.isActive = String(query.isActive) === 'true';
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { employeeCode: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          employeeCode: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          isAcceptingLeads: true,
          lastLoginAt: true,
          failedLoginAttempts: true,
          lockoutUntil: true,
          lockoutCycle: true,
          lastFailedLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              assignedLeads: true,
              callLogs: true,
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
   * Retrieves detailed employee profile
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeCode: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        isAcceptingLeads: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
        lockoutCycle: true,
        lastFailedLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedLeads: true,
            callLogs: true,
            pendingReviews: true,
            approvalRequests: true,
            ordersCreated: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Updates employee metadata
   */
  async updateEmployee(id: string, dto: UpdateEmployeeDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (dto.email && dto.email.trim().toLowerCase() !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (emailTaken) {
        throw new ConflictException(`Email ${dto.email} is already taken`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          firstName: dto.firstName?.trim(),
          lastName: dto.lastName?.trim(),
          email: dto.email?.trim().toLowerCase(),
          phoneNumber: dto.phoneNumber?.trim(),
          role: dto.role,
          isAcceptingLeads: dto.isAcceptingLeads,
        },
        select: {
          id: true,
          employeeCode: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          isAcceptingLeads: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'EMPLOYEE_UPDATED',
          entityType: 'User',
          entityId: id,
          oldState: existing as any,
          newState: user as any,
        },
      });

      return user;
    });

    this.logger.log(`Employee ${id} updated by admin ${actorId}`);
    return updated;
  }

  /**
   * Activates or deactivates an employee account.
   * CRITICAL SECURITY REQUIREMENT: Deactivating immediately terminates all active sessions
   * and revokes all refresh tokens!
   */
  async toggleStatus(id: string, dto: ToggleStatusDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (existing.id === actorId && !dto.isActive) {
      throw new BadRequestException('Security violation: You cannot deactivate your own account.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { isActive: dto.isActive },
        select: {
          id: true,
          employeeCode: true,
          email: true,
          isActive: true,
          updatedAt: true,
        },
      });

      // If deactivating, immediately revoke all active refresh tokens and sessions
      if (!dto.isActive) {
        await tx.refreshToken.updateMany({
          where: { userId: id, isRevoked: false },
          data: { isRevoked: true },
        });

        await tx.userSession.updateMany({
          where: { userId: id, isActive: true },
          data: { isActive: false },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: dto.isActive ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
          entityType: 'User',
          entityId: id,
          oldState: { isActive: existing.isActive },
          newState: { isActive: dto.isActive, reason: dto.reason },
        },
      });

      return user;
    });

    this.logger.log(
      `Employee ${existing.employeeCode} status changed to ${dto.isActive ? 'ACTIVE' : 'DEACTIVATED'} by admin ${actorId}`,
    );
    return updated;
  }

  /**
   * Secure employee password reset by Super Admin
   */
  async resetPassword(id: string, newPassword: string, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lockoutCycle: 0,
        },
      });

      // Revoke all existing sessions and refresh tokens to force fresh login with new password
      await tx.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      });

      await tx.userSession.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'EMPLOYEE_PASSWORD_RESET',
          entityType: 'User',
          entityId: id,
        },
      });
    });

    this.logger.log(`Password reset executed for employee ${existing.employeeCode} by admin ${actorId}`);
    return {
      success: true,
      message: `Password for employee ${existing.employeeCode} has been successfully reset. Active sessions revoked.`,
    };
  }

  /**
   * Super Admin action: Manually unlock a locked employee account and reset failed attempt counters
   */
  async unlockAccount(id: string, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lockoutCycle: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'ACCOUNT_UNLOCKED_BY_ADMIN',
          entityType: 'User',
          entityId: id,
          newState: {
            unlockedEmployeeCode: existing.employeeCode,
            unlockedEmail: existing.email,
            unlockedName: `${existing.firstName} ${existing.lastName}`,
          },
        },
      });
    });

    this.logger.log(`Account ${existing.employeeCode} manually unlocked by admin ${actorId}`);
    return {
      success: true,
      message: `Account for employee ${existing.employeeCode} (${existing.firstName} ${existing.lastName}) has been successfully unlocked.`,
    };
  }

  /**
   * Permanently delete an employee record and cleanly unwind associated operational ties
   */
  async deleteEmployee(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (user.id === actorId) {
      throw new BadRequestException('Security violation: You cannot delete your own account.');
    }

    if (user.employeeCode === 'MEL-ADM-001') {
      throw new BadRequestException('Root Super Admin account cannot be deleted.');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Unassign leads currently assigned to this user
      await tx.lead.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null, status: LeadStatus.NEW },
      });

      // 2. Clear createdById on leads created by this user
      await tx.lead.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });

      // 3. Remove lead assignments given or received
      await tx.leadAssignment.deleteMany({
        where: { OR: [{ assignedToId: id }, { assignedById: id }] },
      });

      // 4. Remove tele-consultation call logs
      await tx.callLog.deleteMany({
        where: { callerId: id },
      });

      // 5. Remove tele-sales follow-ups
      await tx.followUp.deleteMany({
        where: { assignedToId: id },
      });

      // 6. Unlink claimed reviewer on pending reviews
      await tx.pendingReview.updateMany({
        where: { claimedById: id },
        data: { claimedById: null },
      });
      await tx.pendingReview.updateMany({
        where: { submittedById: id },
        data: { submittedById: actorId },
      });

      // 7. Unlink approval officer on approval requests
      await tx.approvalRequest.updateMany({
        where: { officerId: id },
        data: { officerId: null },
      });

      // 8. Reassign orders booked by this user to the administering Super Admin
      await tx.order.updateMany({
        where: { createdById: id },
        data: { createdById: actorId },
      });

      // 9. Remove customer follow up logs & follow-ups
      await tx.customerFollowUpLog.deleteMany({
        where: { callerId: id },
      });
      await tx.customerFollowUp.deleteMany({
        where: { OR: [{ assignedToId: id }, { assignedById: id }] },
      });

      // 10. Unlink audit logs referencing this user to preserve immutable audit trail
      await tx.auditLog.updateMany({
        where: { userId: id },
        data: { userId: null },
      });

      // 11. Remove active sessions, refresh tokens and notifications
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });

      // 12. Archive complete snapshot to 30-Day Recovery Vault
      const adminUser = await tx.user.findUnique({
        where: { id: actorId },
        select: { employeeCode: true },
      });

      await this.recycleBinService.archiveRecord({
        entityType: 'EMPLOYEE',
        entityId: id,
        itemIdentifier: user.employeeCode,
        displayName: `${user.firstName} ${user.lastName} (${user.role})`,
        category: 'Staff Credentials',
        dataSnapshot: {
          id: user.id,
          employeeCode: user.employeeCode,
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isActive: user.isActive,
          isAcceptingLeads: user.isAcceptingLeads,
          createdAt: user.createdAt,
        },
        deleteReason: 'Super Admin manual deletion',
        actorId,
        actorCode: adminUser?.employeeCode || 'MEL-ADM-001',
      });

      // 13. Record deletion in AuditLog
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'EMPLOYEE_DELETED',
          entityType: 'User',
          entityId: id,
          oldState: {
            employeeCode: user.employeeCode,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        },
      });

      // 14. Permanently delete the user record from active table
      await tx.user.delete({ where: { id } });
    });

    this.logger.log(`Employee ${user.employeeCode} (${user.email}) permanently deleted by admin ${actorId}`);
    return {
      success: true,
      message: `Employee ${user.employeeCode} (${user.firstName} ${user.lastName}) has been permanently deleted.`,
    };
  }

  /**
   * Retrieves comprehensive work activity, role-tailored KPIs, recent work ledger,
   * and chronological audit trail for the Super Admin Employee Dossier.
   */
  async getEmployeeActivity(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeCode: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        isAcceptingLeads: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
        lockoutCycle: true,
        lastFailedLoginAt: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          where: { isActive: true },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            lastActiveAt: true,
            createdAt: true,
          },
          orderBy: { lastActiveAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // 1. Audit logs for this user (up to 30 most recent actions)
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        newState: true,
        oldState: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });

    const summary: Record<string, any> = {};
    const breakdowns: Record<string, any> = {};
    const recentWorkItems: Record<string, any> = {};

    // 2. Role-specific aggregations:
    // SALESPERSON
    if (user.role === RoleType.SALESPERSON || user.role === RoleType.SUPER_ADMIN) {
      const [
        leadsCount,
        leadsByStatusRaw,
        leadsBySourceRaw,
        recentLeads,
        callLogsCount,
        callDurationAgg,
        callOutcomesRaw,
        recentCalls,
        ordersCount,
        ordersRevenueAgg,
        ordersByStatusRaw,
        recentOrders,
      ] = await Promise.all([
        this.prisma.lead.count({ where: { assignedToId: id } }),
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { assignedToId: id },
          _count: true,
        }),
        this.prisma.lead.groupBy({
          by: ['sourceType'],
          where: { assignedToId: id },
          _count: true,
        }),
        this.prisma.lead.findMany({
          where: { assignedToId: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            leadCode: true,
            customerName: true,
            phoneNumber: true,
            productInterest: true,
            status: true,
            sourceType: true,
            priority: true,
            createdAt: true,
          },
        }),
        this.prisma.callLog.count({ where: { callerId: id } }),
        this.prisma.callLog.aggregate({
          where: { callerId: id },
          _sum: { durationSeconds: true },
          _avg: { durationSeconds: true },
        }),
        this.prisma.callLog.groupBy({
          by: ['callOutcome'],
          where: { callerId: id },
          _count: true,
        }),
        this.prisma.callLog.findMany({
          where: { callerId: id },
          orderBy: { calledAt: 'desc' },
          take: 10,
          include: {
            lead: {
              select: {
                leadCode: true,
                customerName: true,
                phoneNumber: true,
              },
            },
          },
        }),
        this.prisma.order.count({ where: { createdById: id } }),
        this.prisma.order.aggregate({
          where: { createdById: id },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where: { createdById: id },
          _count: true,
        }),
        this.prisma.order.findMany({
          where: { createdById: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            customer: {
              select: {
                customerCode: true,
                fullName: true,
                phoneNumber: true,
              },
            },
          },
        }),
      ]);

      const leadsByStatus = leadsByStatusRaw.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      const leadsBySource = leadsBySourceRaw.reduce((acc, curr) => {
        acc[curr.sourceType] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      const callOutcomes = callOutcomesRaw.reduce((acc, curr) => {
        acc[curr.callOutcome] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      const ordersByStatus = ordersByStatusRaw.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      const convertedCount = leadsByStatus['CONVERTED'] || 0;
      const conversionRate = leadsCount > 0 ? Number(((convertedCount / leadsCount) * 100).toFixed(1)) : 0;
      const totalRevenue = Number(ordersRevenueAgg._sum.totalAmount || 0);

      summary.totalAssignedLeads = leadsCount;
      summary.convertedLeads = convertedCount;
      summary.conversionRate = conversionRate;
      summary.totalCalls = callLogsCount;
      summary.totalCallDurationSeconds = callDurationAgg._sum.durationSeconds || 0;
      summary.avgCallDurationSeconds = Math.round(callDurationAgg._avg.durationSeconds || 0);
      summary.totalOrdersBooked = ordersCount;
      summary.realizedRevenue = totalRevenue;

      breakdowns.leadsByStatus = leadsByStatus;
      breakdowns.leadsBySource = leadsBySource;
      breakdowns.callOutcomes = callOutcomes;
      breakdowns.ordersByStatus = ordersByStatus;

      recentWorkItems.leads = recentLeads;
      recentWorkItems.calls = recentCalls;
      recentWorkItems.orders = recentOrders;
    }

    // BILLING_EXECUTIVE
    if (user.role === RoleType.BILLING_EXECUTIVE || user.role === RoleType.SUPER_ADMIN) {
      // Find invoices generated through audit logs or query recent
      const invoiceAuditLogs = await this.prisma.auditLog.findMany({
        where: {
          userId: id,
          action: 'INVOICE_GENERATED',
        },
        select: { entityId: true },
        take: 100,
      });
      const invoiceIds = invoiceAuditLogs.map((l) => l.entityId).filter(Boolean);

      let invoices: any[] = [];
      let invoicesAgg: any = { _count: 0, _sum: {} };

      if (invoiceIds.length > 0) {
        [invoices, invoicesAgg] = await Promise.all([
          this.prisma.invoice.findMany({
            where: { id: { in: invoiceIds } },
            orderBy: { issuedAt: 'desc' },
            take: 10,
            include: {
              order: {
                include: {
                  customer: { select: { fullName: true, phoneNumber: true, state: true } },
                },
              },
            },
          }),
          this.prisma.invoice.aggregate({
            where: { id: { in: invoiceIds } },
            _sum: {
              grandTotal: true,
              totalTax: true,
              cgstAmount: true,
              sgstAmount: true,
              igstAmount: true,
            },
            _count: true,
          }),
        ]);
      } else {
        // Fallback to recent system invoices if not logged by specific user ID
        [invoices, invoicesAgg] = await Promise.all([
          this.prisma.invoice.findMany({
            orderBy: { issuedAt: 'desc' },
            take: 10,
            include: {
              order: {
                include: {
                  customer: { select: { fullName: true, phoneNumber: true, state: true } },
                },
              },
            },
          }),
          this.prisma.invoice.aggregate({
            _sum: {
              grandTotal: true,
              totalTax: true,
              cgstAmount: true,
              sgstAmount: true,
              igstAmount: true,
            },
            _count: true,
          }),
        ]);
      }

      // Inventory actions by this staff member
      const inventoryAudits = await this.prisma.auditLog.findMany({
        where: {
          userId: id,
          action: { in: ['INVENTORY_RESTOCKED', 'INVENTORY_ADJUSTED', 'STOCK_RESTOCKED_FROM_RETURN'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      summary.totalInvoices = invoicesAgg._count || 0;
      summary.totalInvoicedAmount = Number(invoicesAgg._sum.grandTotal || 0);
      summary.totalGstCollected = Number(invoicesAgg._sum.totalTax || 0);
      summary.cgstTotal = Number(invoicesAgg._sum.cgstAmount || 0);
      summary.sgstTotal = Number(invoicesAgg._sum.sgstAmount || 0);
      summary.igstTotal = Number(invoicesAgg._sum.igstAmount || 0);
      summary.inventoryActionsLogged = inventoryAudits.length;

      recentWorkItems.invoices = invoices;
      recentWorkItems.inventoryActions = inventoryAudits;
    }

    // APPROVAL_OFFICER
    if (user.role === RoleType.APPROVAL_OFFICER || user.role === RoleType.SUPER_ADMIN) {
      const [decisionsRaw, totalDecisions, recentApprovals] = await Promise.all([
        this.prisma.approvalRequest.groupBy({
          by: ['decision'],
          where: { officerId: id },
          _count: true,
        }),
        this.prisma.approvalRequest.count({ where: { officerId: id } }),
        this.prisma.approvalRequest.findMany({
          where: { officerId: id },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          include: {
            lead: {
              select: {
                leadCode: true,
                customerName: true,
                phoneNumber: true,
                productInterest: true,
                state: true,
              },
            },
          },
        }),
      ]);

      const decisionBreakdown = decisionsRaw.reduce((acc, curr) => {
        if (curr.decision) acc[curr.decision] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      summary.totalApprovalsReviewed = totalDecisions;
      summary.approvedCount = decisionBreakdown['APPROVE'] || 0;
      summary.rejectedCount = decisionBreakdown['REJECT'] || 0;
      summary.sentBackCount = decisionBreakdown['SEND_BACK'] || 0;
      summary.approvalRate =
        totalDecisions > 0
          ? Number((((decisionBreakdown['APPROVE'] || 0) / totalDecisions) * 100).toFixed(1))
          : 0;

      breakdowns.approvalDecisions = decisionBreakdown;
      recentWorkItems.approvals = recentApprovals;
    }

    // PENDING_REVIEWER
    if (user.role === RoleType.PENDING_REVIEWER || user.role === RoleType.SUPER_ADMIN) {
      const [reviewsRaw, totalReviews, recentReviews] = await Promise.all([
        this.prisma.pendingReview.groupBy({
          by: ['decision'],
          where: { claimedById: id },
          _count: true,
        }),
        this.prisma.pendingReview.count({ where: { claimedById: id } }),
        this.prisma.pendingReview.findMany({
          where: { claimedById: id },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          include: {
            lead: {
              select: {
                leadCode: true,
                customerName: true,
                phoneNumber: true,
                productInterest: true,
              },
            },
          },
        }),
      ]);

      const reviewBreakdown = reviewsRaw.reduce((acc, curr) => {
        if (curr.decision) acc[curr.decision] = curr._count;
        return acc;
      }, {} as Record<string, number>);

      summary.totalReviewsHandled = totalReviews;
      summary.reviewApproved = reviewBreakdown['APPROVE'] || 0;
      summary.reviewRejected = reviewBreakdown['REJECT'] || 0;
      summary.reviewSentBack = reviewBreakdown['SEND_BACK'] || 0;

      breakdowns.reviewDecisions = reviewBreakdown;
      recentWorkItems.pendingReviews = recentReviews;
    }

    // FOLLOWUP_EXECUTIVE
    if (user.role === RoleType.FOLLOWUP_EXECUTIVE || user.role === RoleType.SUPER_ADMIN) {
      const [followupsCount, recentFollowups, customerLogs] = await Promise.all([
        this.prisma.customerFollowUp.count({ where: { assignedToId: id } }),
        this.prisma.customerFollowUp.findMany({
          where: { assignedToId: id },
          orderBy: { scheduledTime: 'desc' },
          take: 10,
          include: {
            customer: { select: { fullName: true, phoneNumber: true } },
          },
        }),
        this.prisma.customerFollowUpLog.findMany({
          where: { callerId: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            followUp: {
              include: { customer: { select: { fullName: true, phoneNumber: true } } },
            },
          },
        }),
      ]);

      summary.totalFollowupsAssigned = followupsCount;
      summary.totalFollowupCallsLogged = customerLogs.length;
      recentWorkItems.followups = recentFollowups;
      recentWorkItems.followupLogs = customerLogs;
    }

    // MANAGEMENT
    if (user.role === RoleType.MANAGEMENT || user.role === RoleType.SUPER_ADMIN) {
      const [dispatchesCount, returnsHandled] = await Promise.all([
        this.prisma.auditLog.count({
          where: {
            userId: id,
            action: { in: ['ORDER_DISPATCHED', 'COURIER_ASSIGNED'] },
          },
        }),
        this.prisma.orderReturn.findMany({
          where: { handledById: id },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          include: {
            order: {
              include: { customer: { select: { fullName: true, phoneNumber: true } } },
            },
          },
        }),
      ]);

      summary.dispatchesHandled = dispatchesCount;
      summary.returnsHandled = returnsHandled.length;
      recentWorkItems.returns = returnsHandled;
    }

    return {
      employee: user,
      summary,
      breakdowns,
      recentWorkItems,
      auditTrail: auditLogs,
    };
  }
}
