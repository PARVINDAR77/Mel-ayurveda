import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType, User, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
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
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
        data: { passwordHash },
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
}
