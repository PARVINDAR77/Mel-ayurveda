import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeadStatus, RoleType } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('CustomersService Unit Tests', () => {
  let service: CustomersService;
  let prisma: any;

  const mockUserMgmt = {
    id: 'user-mgt-1',
    employeeCode: 'MEL-MGT-001',
    email: 'neha.mehta@melayurveda.com',
    firstName: 'Neha',
    lastName: 'Mehta',
    role: RoleType.MANAGEMENT,
    isActive: true,
  };

  const mockApprovedLead = {
    id: 'lead-appr-1',
    leadCode: 'MEL-LEAD-000101',
    customerName: 'Aarav Patel',
    phoneNumber: '9825012345',
    city: 'Ahmedabad',
    state: 'Gujarat',
    status: LeadStatus.APPROVED,
    customer: null,
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCustomerCode', () => {
    it('should generate sequential customer code starting from MEL-CUST-000101', async () => {
      prisma.customer.findMany.mockResolvedValue([]);

      const code = await service.generateCustomerCode();
      expect(code).toBe('MEL-CUST-000101');
    });

    it('should increment max existing customer code', async () => {
      prisma.customer.findMany.mockResolvedValue([
        { customerCode: 'MEL-CUST-000142' },
      ]);

      const code = await service.generateCustomerCode();
      expect(code).toBe('MEL-CUST-000143');
    });
  });

  describe('convertLeadToCustomer', () => {
    it('should throw NotFoundException if lead not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.convertLeadToCustomer('non-existent', {}, mockUserMgmt),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if lead is NOT APPROVED (e.g. NEW, CONTACTED, PENDING)', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...mockApprovedLead,
        status: LeadStatus.CONTACTED,
      });

      await expect(
        service.convertLeadToCustomer('lead-appr-1', {}, mockUserMgmt),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if lead is already converted', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...mockApprovedLead,
        customer: { customerCode: 'MEL-CUST-000101' },
      });

      await expect(
        service.convertLeadToCustomer('lead-appr-1', {}, mockUserMgmt),
      ).rejects.toThrow(ConflictException);
    });

    it('should convert APPROVED lead to Customer and transition lead status to CONVERTED', async () => {
      prisma.lead.findUnique.mockResolvedValue(mockApprovedLead);
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({
        id: 'cust-1',
        customerCode: 'MEL-CUST-000101',
        fullName: mockApprovedLead.customerName,
        phoneNumber: mockApprovedLead.phoneNumber,
      });
      prisma.lead.update.mockResolvedValue({
        ...mockApprovedLead,
        status: LeadStatus.CONVERTED,
      });

      const res = await service.convertLeadToCustomer('lead-appr-1', {}, mockUserMgmt);

      expect(res.leadStatus).toBe(LeadStatus.CONVERTED);
      expect(res.customer.customerCode).toBe('MEL-CUST-000101');
      expect(prisma.customer.create).toHaveBeenCalled();
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: mockApprovedLead.id },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: expect.any(Date),
        },
      });
      expect(prisma.leadStatusHistory.create).toHaveBeenCalled();
    });
  });
});
