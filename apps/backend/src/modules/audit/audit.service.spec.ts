import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AuditService (Bundle 15 Unit Tests)', () => {
  let service: AuditService;
  let prisma: any;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    it('should create an immutable audit log entry', async () => {
      prisma.auditLog.create.mockResolvedValue({
        id: 'audit-1',
        action: 'LEAD_ASSIGN',
        entityType: 'Lead',
        entityId: 'lead-1',
      });

      const result = await service.logAction({
        action: 'LEAD_ASSIGN',
        entityType: 'Lead',
        entityId: 'lead-1',
        oldState: { assignedTo: null },
        newState: { assignedTo: 'user-1' },
      });

      expect(result.id).toBe('audit-1');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs with metadata', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 'audit-1', action: 'LOGIN', entityType: 'User' },
      ]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return audit record if found', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({
        id: 'audit-1',
        action: 'ORDER_CONFIRM',
      });

      const result = await service.findById('audit-1');
      expect(result.id).toBe('audit-1');
    });

    it('should throw NotFoundException if audit log not found', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('should aggregate audit counts and top actions', async () => {
      prisma.auditLog.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(25); // today
      prisma.auditLog.groupBy.mockResolvedValue([
        { action: 'LOGIN', _count: { action: 40 } },
      ]);

      const result = await service.getSummary();

      expect(result.totalLogs).toBe(150);
      expect(result.logsToday).toBe(25);
      expect(result.topActions[0].action).toBe('LOGIN');
      expect(result.topActions[0].count).toBe(40);
    });
  });
});
