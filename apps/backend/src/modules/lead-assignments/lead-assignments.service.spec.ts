import { Test, TestingModule } from '@nestjs/testing';
import { LeadAssignmentsService } from './lead-assignments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleType, LeadStatus } from '@prisma/client';

describe('LeadAssignmentsService (Bundle 06 Verification)', () => {
  let service: LeadAssignmentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockNotifications = {
      createNotification: jest.fn().mockResolvedValue({}),
      dispatchToRole: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadAssignmentsService,
        { provide: NotificationsService, useValue: mockNotifications },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            lead: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            leadAssignment: {
              create: jest.fn(),
              updateMany: jest.fn(),
              findMany: jest.fn(),
            },
            leadStatusHistory: {
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
          },
        },
      ],
    }).compile();

    service = module.get<LeadAssignmentsService>(LeadAssignmentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('validateAssignee()', () => {
    it('should reject deactivated salesperson', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'sales-1',
        employeeCode: 'MEL-SAL-001',
        isActive: false,
        role: RoleType.SALESPERSON,
      } as any);

      await expect(
        service.assignLead(
          { leadId: 'lead-1', assignedToId: 'sales-1', reason: 'Test' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject assigning to non-sales role (e.g. pending reviewer)', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'pnd-1',
        employeeCode: 'MEL-PND-001',
        isActive: true,
        role: RoleType.PENDING_REVIEWER,
      } as any);

      await expect(
        service.assignLead(
          { leadId: 'lead-1', assignedToId: 'pnd-1', reason: 'Test' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
