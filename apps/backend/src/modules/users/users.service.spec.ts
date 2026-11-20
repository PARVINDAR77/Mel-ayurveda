import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService (Bundle 02 Verification)', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            refreshToken: {
              updateMany: jest.fn(),
            },
            userSession: {
              updateMany: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
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
});
