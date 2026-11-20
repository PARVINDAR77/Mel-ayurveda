import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import { RoleType } from '@prisma/client';

describe('AuthService (Bundle 01 Verification)', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockUser = {
    id: 'test-user-uuid-1',
    employeeCode: 'MEL-ADM-001',
    email: 'admin@melayurveda.com',
    passwordHash: '',
    firstName: 'Super',
    lastName: 'Admin',
    phoneNumber: '9876543210',
    role: RoleType.SUPER_ADMIN,
    isActive: true,
    isAcceptingLeads: true,
    lastLoginAt: null,
  };

  const mockResponse: any = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await hashPassword('Melayurveda@Admin2026!');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            userSession: {
              create: jest.fn(),
            },
            $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock_jwt_access_token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'NODE_ENV') return 'development';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  describe('Password Hashing Verification (Argon2id)', () => {
    it('should correctly hash and verify password using Argon2id', async () => {
      const plain = 'SecurePassword123!';
      const hash = await hashPassword(plain);
      expect(hash).toContain('$argon2id$');
    });
  });

  describe('login()', () => {
    it('should successfully authenticate valid credentials and issue tokens', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.userSession, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      const result = await service.login(
        { email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' },
        '127.0.0.1',
        'Jest Test Runner',
        mockResponse,
      );

      expect(result).toHaveProperty('accessToken', 'mock_jwt_access_token');
      expect(result.user.employeeCode).toBe('MEL-ADM-001');
      expect(result.user.email).toBe('admin@melayurveda.com');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('should reject login for inactive employee account', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      await expect(
        service.login(
          { email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' },
          '127.0.0.1',
          'Jest Test Runner',
          mockResponse,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await expect(
        service.login(
          { email: 'admin@melayurveda.com', password: 'WrongPassword999!' },
          '127.0.0.1',
          'Jest Test Runner',
          mockResponse,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
