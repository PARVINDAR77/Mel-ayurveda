import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeLeadForSalesperson, formatLeadForAdmin } from './dto/lead-projections';
import { LeadPriority, LeadStatus, LeadSourceType } from '@prisma/client';

describe('LeadsService (Bundle 05 Verification)', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: {
            lead: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            leadAssignment: {
              create: jest.fn(),
            },
            leadStatusHistory: {
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
          },
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Phone Normalization', () => {
    it('should normalize 10-digit Indian phone number', () => {
      expect(service.normalizePhoneNumber('9876543210')).toBe('9876543210');
    });

    it('should strip leading 0 from 11-digit number', () => {
      expect(service.normalizePhoneNumber('09876543210')).toBe('9876543210');
    });

    it('should strip leading 91 country code', () => {
      expect(service.normalizePhoneNumber('+919876543210')).toBe('9876543210');
      expect(service.normalizePhoneNumber('919876543210')).toBe('9876543210');
    });
  });

  describe('Lead Code Generator', () => {
    it('should generate MEL-LEAD-000101 as baseline', async () => {
      jest.spyOn(prisma.lead, 'findMany').mockResolvedValue([]);
      const code = await service.generateLeadCode();
      expect(code).toBe('MEL-LEAD-000101');
    });

    it('should sequentially increment from highest existing lead code', async () => {
      jest.spyOn(prisma.lead, 'findMany').mockResolvedValue([
        { leadCode: 'MEL-LEAD-000101' },
        { leadCode: 'MEL-LEAD-000102' },
      ] as any);
      const code = await service.generateLeadCode();
      expect(code).toBe('MEL-LEAD-000103');
    });
  });

  describe('Lead Source Privacy Protection (Strict Security Invariant)', () => {
    const rawLead = {
      id: 'lead-1',
      leadCode: 'MEL-LEAD-000101',
      customerName: 'Rajesh Patel',
      phoneNumber: '9876543210',
      alternatePhone: null,
      email: 'rajesh@gmail.com',
      city: 'Ahmedabad',
      state: 'Gujarat',
      address: 'Satellite Road',
      productInterest: 'Joint Care',
      customerRequirements: 'Knee pain',
      notes: 'Notes',
      priority: LeadPriority.HIGH,
      status: LeadStatus.ASSIGNED,
      assignedAt: new Date(),
      lastContactedAt: null,
      createdAt: new Date(),
      // SENSITIVE MARKETING ATTRIBUTES
      sourceId: 'src-meta-1',
      sourceType: LeadSourceType.FACEBOOK_ADS,
      campaignId: 'fb_cmp_987654321',
      campaignName: 'JointCare_Ahmedabad_Lookalike_25-55',
      adSetId: 'adset_123',
      adId: 'ad_456',
      costPerLead: 245.5,
      externalLeadId: 'ext_fb_lead_123',
      rawPayload: { click_id: 'fbclid_999' },
    };

    it('salesperson projection must NOT expose any lead source or marketing fields', () => {
      const sanitized = sanitizeLeadForSalesperson(rawLead);
      expect(sanitized).toHaveProperty('leadCode', 'MEL-LEAD-000101');
      expect(sanitized).toHaveProperty('customerName', 'Rajesh Patel');
      expect(sanitized).toHaveProperty('phoneNumber', '9876543210');

      // CRITICAL ASSERTIONS: Must be completely omitted!
      expect((sanitized as any).sourceId).toBeUndefined();
      expect((sanitized as any).sourceType).toBeUndefined();
      expect((sanitized as any).campaignId).toBeUndefined();
      expect((sanitized as any).campaignName).toBeUndefined();
      expect((sanitized as any).adSetId).toBeUndefined();
      expect((sanitized as any).adId).toBeUndefined();
      expect((sanitized as any).costPerLead).toBeUndefined();
      expect((sanitized as any).externalLeadId).toBeUndefined();
      expect((sanitized as any).rawPayload).toBeUndefined();
    });

    it('admin projection should retain full marketing source intelligence', () => {
      const adminDto = formatLeadForAdmin(rawLead);
      expect(adminDto).toHaveProperty('sourceType', LeadSourceType.FACEBOOK_ADS);
      expect(adminDto).toHaveProperty('campaignName', 'JointCare_Ahmedabad_Lookalike_25-55');
      expect(adminDto).toHaveProperty('costPerLead', 245.5);
    });
  });
});
