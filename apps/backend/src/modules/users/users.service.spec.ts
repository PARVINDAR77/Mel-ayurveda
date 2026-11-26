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
              count: jest.fn().mockResolvedValue(0),
              groupBy: jest.fn().mockResolvedValue([]),
              findMany: jest.fn().mockResolvedValue([]),
            },
            leadAssignment: {
              deleteMany: jest.fn(),
            },
            callLog: {
              deleteMany: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
              aggregate: jest.fn().mockResolvedValue({ _sum: { durationSeconds: 0 }, _avg: { durationSeconds: 0 } }),
              groupBy: jest.fn().mockResolvedValue([]),
              findMany: jest.fn().mockResolvedValue([]),
            },
            followUp: {
              deleteMany: jest.fn(),
            },
            pendingReview: {
              updateMany: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
              groupBy: jest.fn().mockResolvedValue([]),
              findMany: jest.fn().mockResolvedValue([]),
            },
            approvalRequest: {
              updateMany: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
              groupBy: jest.fn().mockResolvedValue([]),
              findMany: jest.fn().mockResolvedValue([]),
            },
            order: {
              updateMany: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
              aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: 0 } }),
              groupBy: jest.fn().mockResolvedValue([]),
              findMany: jest.fn().mockResolvedValue([]),
            },
            invoice: {
              findMany: jest.fn().mockResolvedValue([]),
              aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: {} }),
            },
            orderReturn: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            customerFollowUpLog: {
              deleteMany: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
            customerFollowUp: {
              deleteMany: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
              findMany: jest.fn().mockResolvedValue([]),
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
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
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

  describe('getEmployeeActivity()', () => {
    it('should throw NotFoundException if employee is not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(service.getEmployeeActivity('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return aggregated activity for a SALESPERSON', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'sales-1',
        employeeCode: 'MEL-SAL-010',
        firstName: 'Vikram',
        lastName: 'Consultant',
        email: 'consultant1@melayurveda.com',
        phoneNumber: '9123456789',
        role: RoleType.SALESPERSON,
        isActive: true,
        sessions: [],
      } as any);

      jest.spyOn(prisma.lead, 'count').mockResolvedValue(25);
      jest.spyOn(prisma.lead, 'groupBy').mockImplementation(({ by }: any) => {
        if (by.includes('status')) {
          return Promise.resolve([
            { status: 'NEW', _count: 10 },
            { status: 'CONVERTED', _count: 5 },
          ]) as any;
        }
        if (by.includes('sourceType')) {
          return Promise.resolve([
            { sourceType: 'FACEBOOK_ADS', _count: 15 },
            { sourceType: 'GOOGLE_ADS', _count: 10 },
          ]) as any;
        }
        return Promise.resolve([]);
      });

      jest.spyOn(prisma.callLog, 'count').mockResolvedValue(40);
      jest.spyOn(prisma.callLog, 'aggregate').mockResolvedValue({
        _sum: { durationSeconds: 2400 },
        _avg: { durationSeconds: 60 },
      } as any);

      jest.spyOn(prisma.order, 'count').mockResolvedValue(5);
      jest.spyOn(prisma.order, 'aggregate').mockResolvedValue({
        _sum: { totalAmount: 12500 },
      } as any);

      const dossier = await service.getEmployeeActivity('sales-1');

      expect(dossier.employee.employeeCode).toBe('MEL-SAL-010');
      expect(dossier.summary.totalAssignedLeads).toBe(25);
      expect(dossier.summary.convertedLeads).toBe(5);
      expect(dossier.summary.conversionRate).toBe(20);
      expect(dossier.summary.totalCalls).toBe(40);
      expect(dossier.summary.totalOrdersBooked).toBe(5);
      expect(dossier.summary.realizedRevenue).toBe(12500);
      expect(dossier.breakdowns.leadsBySource['FACEBOOK_ADS']).toBe(15);
    });

    it('should return aggregated activity for a BILLING_EXECUTIVE', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'bil-1',
        employeeCode: 'MEL-BIL-001',
        firstName: 'Ram',
        lastName: 'Patel',
        email: 'billing@melayurveda.com',
        phoneNumber: '9104082233',
        role: RoleType.BILLING_EXECUTIVE,
        isActive: true,
        sessions: [],
      } as any);

      jest.spyOn(prisma.invoice, 'aggregate').mockResolvedValue({
        _count: 18,
        _sum: {
          grandTotal: 34500,
          totalTax: 4140,
          cgstAmount: 2070,
          sgstAmount: 2070,
          igstAmount: 0,
        },
      } as any);

      const dossier = await service.getEmployeeActivity('bil-1');

      expect(dossier.employee.employeeCode).toBe('MEL-BIL-001');
      expect(dossier.summary.totalInvoices).toBe(18);
      expect(dossier.summary.totalInvoicedAmount).toBe(34500);
      expect(dossier.summary.totalGstCollected).toBe(4140);
      expect(dossier.summary.cgstTotal).toBe(2070);
    });
  });
});
