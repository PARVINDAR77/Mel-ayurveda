import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RecycleBinService } from '../recycle-bin/recycle-bin.service';
import { RoleType } from '@prisma/client';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService (Bundle 02 Verification)', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockNotifications = {
      createNotification: jest.fn().mockResolvedValue({}),
      dispatchToRole: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: NotificationsService, useValue: mockNotifications },
        {
          provide: RecycleBinService,
          useValue: { archiveRecord: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            lead: {
              updateMany: jest.fn(),
            },
            leadAssignment: {
              deleteMany: jest.fn(),
            },
            callLog: {
              deleteMany: jest.fn(),
            },
            followUp: {
              deleteMany: jest.fn(),
            },
            pendingReview: {
              updateMany: jest.fn(),
            },
            approvalRequest: {
              updateMany: jest.fn(),
            },
            order: {
              updateMany: jest.fn(),
            },
            customerFollowUpLog: {
              deleteMany: jest.fn(),
            },
            customerFollowUp: {
              deleteMany: jest.fn(),
            },
            notification: {
              deleteMany: jest.fn(),
            },
            refreshToken: {
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            userSession: {
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generateEmployeeCode()', () => {
    it('should generate MEL-SAL-001 when no salesperson exists', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
      const code = await service.generateEmployeeCode(RoleType.SALESPERSON);
      expect(code).toBe('MEL-SAL-001');
    });

    it('should generate next sequential code MEL-SAL-004 when 001, 002, 003 exist', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        { employeeCode: 'MEL-SAL-001' },
        { employeeCode: 'MEL-SAL-002' },
        { employeeCode: 'MEL-SAL-003' },
      ] as any);
      const code = await service.generateEmployeeCode(RoleType.SALESPERSON);
      expect(code).toBe('MEL-SAL-004');
    });

    it('should generate MEL-PND-001 for pending reviewer role', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
      const code = await service.generateEmployeeCode(RoleType.PENDING_REVIEWER);
      expect(code).toBe('MEL-PND-001');
    });

    it('should generate MEL-APR-001 for approval officer role', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
      const code = await service.generateEmployeeCode(RoleType.APPROVAL_OFFICER);
      expect(code).toBe('MEL-APR-001');
    });

    it('should generate MEL-MGT-001 for management role', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
      const code = await service.generateEmployeeCode(RoleType.MANAGEMENT);
      expect(code).toBe('MEL-MGT-001');
    });
  });

  describe('createEmployee()', () => {
    it('should reject duplicate email with ConflictException', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'exists' } as any);

      await expect(
        service.createEmployee(
          {
            firstName: 'Ramesh',
            lastName: 'Patel',
            email: 'ramesh.patel@melayurveda.com',
            phoneNumber: '9876543210',
            role: RoleType.SALESPERSON,
          },
          'admin-id-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteEmployee()', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(service.deleteEmployee('non-existent-id', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject deleting own account with BadRequestException', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'admin-1',
        employeeCode: 'MEL-ADM-002',
      } as any);

      await expect(service.deleteEmployee('admin-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject deleting root Super Admin MEL-ADM-001', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'root-admin-id',
        employeeCode: 'MEL-ADM-001',
      } as any);

      await expect(service.deleteEmployee('root-admin-id', 'admin-other')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete non-root employee successfully', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'sales-1',
        employeeCode: 'MEL-SAL-013',
        firstName: 'Temp',
        lastName: 'Agent',
        email: 'temp.agent@melayurveda.com',
        role: RoleType.SALESPERSON,
      } as any);

      const result = await service.deleteEmployee('sales-1', 'admin-1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('MEL-SAL-013');
    });
  });
});
