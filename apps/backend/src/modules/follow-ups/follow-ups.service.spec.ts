import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpsService } from './follow-ups.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FollowUpStatus, LeadStatus, RoleType } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('FollowUpsService Unit Tests', () => {
  let service: FollowUpsService;
  let prisma: any;

  const mockUserSales = {
    id: 'user-sales-1',
    employeeCode: 'MEL-SAL-001',
    email: 'ramesh@melayurveda.com',
    firstName: 'Ramesh',
    lastName: 'Patel',
    role: RoleType.SALESPERSON,
    isActive: true,
  };

  const mockLead = {
    id: 'lead-1',
    leadCode: 'MEL-LEAD-000101',
    customerName: 'Aarav Patel',
    assignedToId: 'user-sales-1',
    status: LeadStatus.ASSIGNED,
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      followUp: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      leadStatusHistory: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FollowUpsService>(FollowUpsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException if lead not found', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await expect(
      service.createFollowUp(
        {
          leadId: 'non-existent',
          scheduledTime: new Date().toISOString(),
        },
        mockUserSales,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if salesperson attempts to schedule follow-up for unassigned lead (Anti-IDOR)', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      ...mockLead,
      assignedToId: 'other-user',
    });

    await expect(
      service.createFollowUp(
        {
          leadId: 'lead-1',
          scheduledTime: new Date().toISOString(),
        },
        mockUserSales,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create scheduled follow-up and advance lead status to FOLLOW_UP_REQUIRED', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);
    const scheduledTime = new Date(Date.now() + 86400000).toISOString();
    prisma.followUp.create.mockResolvedValue({
      id: 'fu-1',
      leadId: mockLead.id,
      assignedToId: mockUserSales.id,
      scheduledTime: new Date(scheduledTime),
      status: FollowUpStatus.SCHEDULED,
    });

    const result = await service.createFollowUp(
      {
        leadId: mockLead.id,
        scheduledTime,
        reminderNotes: 'Check back regarding herbal decoction',
      },
      mockUserSales,
    );

    expect(result.status).toBe(FollowUpStatus.SCHEDULED);
    expect(prisma.followUp.create).toHaveBeenCalled();
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: mockLead.id },
      data: { status: LeadStatus.FOLLOW_UP_REQUIRED },
    });
  });

  it('should throw ForbiddenException when salesperson attempts to complete another user follow-up', async () => {
    prisma.followUp.findUnique.mockResolvedValue({
      id: 'fu-2',
      assignedToId: 'other-user',
      status: FollowUpStatus.SCHEDULED,
    });

    await expect(
      service.completeFollowUp('fu-2', mockUserSales),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should successfully complete follow-up owned by salesperson', async () => {
    prisma.followUp.findUnique.mockResolvedValue({
      id: 'fu-1',
      assignedToId: mockUserSales.id,
      status: FollowUpStatus.SCHEDULED,
    });
    prisma.followUp.update.mockResolvedValue({
      id: 'fu-1',
      status: FollowUpStatus.COMPLETED,
      completedAt: new Date(),
    });

    const completed = await service.completeFollowUp('fu-1', mockUserSales);
    expect(completed.status).toBe(FollowUpStatus.COMPLETED);
    expect(prisma.followUp.update).toHaveBeenCalled();
  });
});
