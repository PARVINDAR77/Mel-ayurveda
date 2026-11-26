import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalsService } from './approvals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalDecision, LeadStatus, RoleType } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('ApprovalsService Unit Tests', () => {
  let service: ApprovalsService;
  let prisma: any;

  const mockOfficer = {
    id: 'user-apr-1',
    employeeCode: 'MEL-APR-001',
    email: 'amit.desai@melayurveda.com',
    firstName: 'Amit',
    lastName: 'Desai',
    role: RoleType.APPROVAL_OFFICER,
    isActive: true,
  };

  const mockLead = {
    id: 'lead-1',
    leadCode: 'MEL-LEAD-000101',
    customerName: 'Aarav Patel',
    status: LeadStatus.APPROVAL_REQUESTED,
  };

  const mockApprovalRequest = {
    id: 'apr-req-1',
    leadId: mockLead.id,
    officerId: null,
    decision: null,
    lead: mockLead,
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        update: jest.fn(),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      approvalRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn(),
      },
      leadStatusHistory: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const mockNotifications = {
      createNotification: jest.fn().mockResolvedValue({}),
      dispatchToRole: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('claimApproval', () => {
    it('should throw NotFoundException if approval request not found', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.claimApproval('non-existent', mockOfficer),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already claimed by another officer', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        officerId: 'other-officer-id',
        officer: { employeeCode: 'MEL-APR-002', firstName: 'Vikram' },
      });

      await expect(
        service.claimApproval('apr-req-1', mockOfficer),
      ).rejects.toThrow(ConflictException);
    });

    it('should claim approval request successfully', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue(mockApprovalRequest);
      prisma.approvalRequest.update.mockResolvedValue({
        ...mockApprovalRequest,
        officerId: mockOfficer.id,
      });

      const res = await service.claimApproval('apr-req-1', mockOfficer);
      expect(res.officerId).toBe(mockOfficer.id);
      expect(prisma.approvalRequest.update).toHaveBeenCalled();
    });
  });

  describe('decideApproval', () => {
    it('should throw ConflictException if request already decided', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        decision: ApprovalDecision.APPROVE,
      });

      await expect(
        service.decideApproval(
          'apr-req-1',
          {
            decision: ApprovalDecision.APPROVE,
            officerNotes: 'Notes',
          },
          mockOfficer,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should execute APPROVE decision: transition lead to APPROVED', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        officerId: mockOfficer.id,
      });
      prisma.approvalRequest.update.mockResolvedValue({
        ...mockApprovalRequest,
        decision: ApprovalDecision.APPROVE,
        officerNotes: 'Medical & pricing certified',
      });

      const res = await service.decideApproval(
        'apr-req-1',
        {
          decision: ApprovalDecision.APPROVE,
          officerNotes: 'Medical & pricing certified',
        },
        mockOfficer,
      );

      expect(res.decision).toBe(ApprovalDecision.APPROVE);
      expect(res.nextLeadStatus).toBe(LeadStatus.APPROVED);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { status: LeadStatus.APPROVED },
      });
    });

    it('should execute REJECT decision: transition lead to REJECTED', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue({
        ...mockApprovalRequest,
        officerId: mockOfficer.id,
      });
      prisma.approvalRequest.update.mockResolvedValue({
        ...mockApprovalRequest,
        decision: ApprovalDecision.REJECT,
      });

      const res = await service.decideApproval(
        'apr-req-1',
        {
          decision: ApprovalDecision.REJECT,
          decisionReason: 'MEDICAL_CONTRAINDICATION',
          officerNotes: 'Cardiovascular contraindication for high dosage guggulu',
        },
        mockOfficer,
      );

      expect(res.decision).toBe(ApprovalDecision.REJECT);
      expect(res.nextLeadStatus).toBe(LeadStatus.REJECTED);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { status: LeadStatus.REJECTED },
      });
    });
  });
});
