import { Test, TestingModule } from '@nestjs/testing';
import { CallingService } from './calling.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CallOutcome, LeadStatus, RoleType } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CallingService Unit Tests', () => {
  let service: CallingService;
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
      callLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      leadStatusHistory: {
        create: jest.fn(),
      },
      followUp: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CallingService>(CallingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException if lead does not exist', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    await expect(
      service.createCallLog(
        { leadId: 'non-existent', callOutcome: CallOutcome.INTERESTED },
        mockUserSales,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if salesperson attempts to log call for unassigned lead (Anti-IDOR)', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      ...mockLead,
      assignedToId: 'other-sales-user',
    });

    await expect(
      service.createCallLog(
        { leadId: 'lead-1', callOutcome: CallOutcome.INTERESTED },
        mockUserSales,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create call log, update lead status, and log status history', async () => {
    prisma.lead.findUnique.mockResolvedValue(mockLead);
    prisma.callLog.create.mockResolvedValue({
      id: 'log-1',
      leadId: mockLead.id,
      callerId: mockUserSales.id,
      callOutcome: CallOutcome.INTERESTED,
      durationSeconds: 120,
    });
    prisma.lead.update.mockResolvedValue({
      ...mockLead,
      status: LeadStatus.INTERESTED,
    });

    const result = await service.createCallLog(
      {
        leadId: mockLead.id,
        callOutcome: CallOutcome.INTERESTED,
        durationSeconds: 120,
        notes: 'Patient confirmed interest in treatment package',
      },
      mockUserSales,
    );

    expect(result.newStatus).toBe(LeadStatus.INTERESTED);
    expect(prisma.callLog.create).toHaveBeenCalled();
    expect(prisma.lead.update).toHaveBeenCalled();
    expect(prisma.leadStatusHistory.create).toHaveBeenCalled();
  });
});
