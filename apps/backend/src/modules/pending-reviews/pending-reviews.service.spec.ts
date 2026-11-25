import { Test, TestingModule } from '@nestjs/testing';
import { PendingReviewsService } from './pending-reviews.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeadStatus, PendingDecision, RoleType } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('PendingReviewsService Unit Tests', () => {
  let service: PendingReviewsService;
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

  const mockUserReviewer = {
    id: 'user-pnd-1',
    employeeCode: 'MEL-PND-001',
    email: 'priya.sharma@melayurveda.com',
    firstName: 'Priya',
    lastName: 'Sharma',
    role: RoleType.PENDING_REVIEWER,
    isActive: true,
  };

  const mockLead = {
    id: 'lead-1',
    leadCode: 'MEL-LEAD-000101',
    customerName: 'Aarav Patel',
    assignedToId: 'user-sales-1',
    status: LeadStatus.INTERESTED,
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      pendingReview: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      approvalRequest: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      leadStatusHistory: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const mockNotifications = {
      createNotification: jest.fn().mockResolvedValue({}),
      dispatchToRole: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendingReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PendingReviewsService>(PendingReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitPendingReview', () => {
    it('should throw NotFoundException if lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.submitPendingReview(
          { leadId: 'non-existent', reason: 'Disputed' },
          mockUserSales,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if salesperson attempts to submit unassigned lead', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        assignedToId: 'other-user',
      });

      await expect(
        service.submitPendingReview(
          { leadId: 'lead-1', reason: 'Chronic morbidity' },
          mockUserSales,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if lead is already in pending queue', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.pendingReview.findFirst.mockResolvedValue({
        id: 'rev-active',
        leadId: mockLead.id,
        decision: null,
      });

      await expect(
        service.submitPendingReview(
          { leadId: 'lead-1', reason: 'Chronic morbidity' },
          mockUserSales,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully submit lead to pending review and update lead status', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.pendingReview.findFirst.mockResolvedValue(null);
      prisma.pendingReview.create.mockResolvedValue({
        id: 'rev-1',
        leadId: mockLead.id,
        submittedById: mockUserSales.id,
        reason: 'Chronic multi-morbidity',
      });
      prisma.lead.update.mockResolvedValue({
        ...mockLead,
        status: LeadStatus.PENDING_REVIEW,
      });

      const res = await service.submitPendingReview(
        { leadId: mockLead.id, reason: 'Chronic multi-morbidity' },
        mockUserSales,
      );

      expect(res.leadStatus).toBe(LeadStatus.PENDING_REVIEW);
      expect(prisma.pendingReview.create).toHaveBeenCalled();
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { status: LeadStatus.PENDING_REVIEW },
      });
    });
  });

  describe('claimReview', () => {
    it('should throw ConflictException if already claimed by another reviewer', async () => {
      prisma.pendingReview.findUnique.mockResolvedValue({
        id: 'rev-1',
        leadId: mockLead.id,
        decision: null,
        claimedById: 'other-reviewer-id',
        claimedBy: { employeeCode: 'MEL-PND-002', firstName: 'Anita' },
        lead: mockLead,
      });

      await expect(
        service.claimReview('rev-1', mockUserReviewer),
      ).rejects.toThrow(ConflictException);
    });

    it('should lock review and update lead status to UNDER_REVIEW', async () => {
      prisma.pendingReview.findUnique.mockResolvedValue({
        id: 'rev-1',
        leadId: mockLead.id,
        decision: null,
        claimedById: null,
        lead: mockLead,
      });
      prisma.pendingReview.update.mockResolvedValue({
        id: 'rev-1',
        claimedById: mockUserReviewer.id,
      });

      const res = await service.claimReview('rev-1', mockUserReviewer);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { status: LeadStatus.UNDER_REVIEW },
      });
    });
  });

  describe('decideReview', () => {
    it('should execute APPROVE decision: generate ApprovalRequest and update status to APPROVAL_REQUESTED', async () => {
      prisma.pendingReview.findUnique.mockResolvedValue({
        id: 'rev-1',
        leadId: mockLead.id,
        decision: null,
        claimedById: mockUserReviewer.id,
        lead: { ...mockLead, status: LeadStatus.UNDER_REVIEW },
      });
      prisma.pendingReview.update.mockResolvedValue({
        id: 'rev-1',
        decision: PendingDecision.APPROVE,
        reviewerNotes: 'Clinical verification passed',
      });

      const result = await service.decideReview(
        'rev-1',
        {
          decision: PendingDecision.APPROVE,
          reviewerNotes: 'Clinical verification passed',
        },
        mockUserReviewer,
      );

      expect(result.decision).toBe(PendingDecision.APPROVE);
      expect(result.nextLeadStatus).toBe(LeadStatus.APPROVAL_REQUESTED);
      expect(prisma.approvalRequest.create).toHaveBeenCalledWith({
        data: { leadId: mockLead.id },
      });
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { status: LeadStatus.APPROVAL_REQUESTED },
      });
    });

    it('should execute REJECT decision: transition lead to REJECTED', async () => {
      prisma.pendingReview.findUnique.mockResolvedValue({
        id: 'rev-1',
        leadId: mockLead.id,
        decision: null,
        claimedById: mockUserReviewer.id,
        lead: { ...mockLead, status: LeadStatus.UNDER_REVIEW },
      });
      prisma.pendingReview.update.mockResolvedValue({
        id: 'rev-1',
        decision: PendingDecision.REJECT,
      });

      const result = await service.decideReview(
        'rev-1',
        {
          decision: PendingDecision.REJECT,
          reviewerNotes: 'Severe kidney contraindication',
        },
        mockUserReviewer,
      );

      expect(result.decision).toBe(PendingDecision.REJECT);
      expect(result.nextLeadStatus).toBe(LeadStatus.REJECTED);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { status: LeadStatus.REJECTED },
      });
    });
  });
});
