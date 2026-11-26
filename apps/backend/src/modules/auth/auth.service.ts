import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, UserSummaryDto } from './dto/auth-response.dto';
import { verifyPassword, generateSecureToken, hashToken } from '../../common/utils/password.util';

const HTTP_STATUS_LOCKED = 423;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Progressive backoff calculation:
   * Cycle 0 -> 5 minutes (300s)
   * Cycle 1 -> 15 minutes (900s)
   * Cycle 2 -> 30 minutes (1800s)
   * Cycle 3 -> 60 minutes (3600s)
   * Cycle 4+ -> 24 hours (86400s)
   */
  getLockoutDurationMinutes(cycle: number): number {
    switch (cycle) {
      case 0:
        return 5;
      case 1:
        return 15;
      case 2:
        return 30;
      case 3:
        return 60;
      default:
        return 1440; // 24 hours
    }
  }

  /**
   * Primary authentication handler with Argon2id check, session tracking,
   * short-lived access token, and rotating refresh token.
   */
  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
    res: Response,
  ): Promise<LoginResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for nonexistent user: ${normalizedEmail} from ${ipAddress}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      this.logger.warn(`Login rejected: inactive employee account ${user.employeeCode}`);
      throw new UnauthorizedException('Your account has been deactivated. Contact Super Admin.');
    }

    const now = new Date();

    // Check if account is currently locked out
    if (user.lockoutUntil && user.lockoutUntil > now) {
      const remainingMs = user.lockoutUntil.getTime() - now.getTime();
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      this.logger.warn(
        `Login blocked by lockout for ${user.employeeCode}: ${remainingSeconds}s remaining (Cycle ${user.lockoutCycle}) from ${ipAddress}`,
      );

      throw new HttpException(
        {
          statusCode: HTTP_STATUS_LOCKED, // 423 Locked
          error: 'AccountLocked',
          message: `Account is temporarily locked due to repeated failed login attempts. Please wait ${remainingMinutes} minute(s) before trying again.`,
          lockoutUntil: user.lockoutUntil.toISOString(),
          remainingSeconds,
          lockoutCycle: user.lockoutCycle,
        },
        HTTP_STATUS_LOCKED,
      );
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lockout threshold: 5 consecutive failed attempts
      if (newFailedAttempts >= 5) {
        const lockoutMinutes = this.getLockoutDurationMinutes(user.lockoutCycle || 0);
        const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
        const newLockoutCycle = (user.lockoutCycle || 0) + 1;

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockoutUntil,
            lockoutCycle: newLockoutCycle,
            lastFailedLoginAt: new Date(),
          },
        });

        // Audit log security event
        try {
          await this.prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'ACCOUNT_LOCKED_TEMPORARY',
              entityType: 'User',
              entityId: user.id,
              ipAddress,
              newState: {
                lockoutMinutes,
                lockoutCycle: newLockoutCycle,
                lockoutUntil: lockoutUntil.toISOString(),
                reason: '5 consecutive failed password attempts',
              },
            },
          });
        } catch (auditErr: any) {
          this.logger.warn(`Could not write audit log for lockout: ${auditErr.message}`);
        }

        this.logger.warn(
          `User ${user.employeeCode} locked out for ${lockoutMinutes}m (Cycle ${newLockoutCycle}) after 5 failed attempts from ${ipAddress}`,
        );

        throw new HttpException(
          {
            statusCode: HTTP_STATUS_LOCKED,
            error: 'AccountLocked',
            message: `Account temporarily locked due to 5 consecutive failed login attempts. Please try again in ${lockoutMinutes} minute(s).`,
            lockoutUntil: lockoutUntil.toISOString(),
            remainingSeconds: lockoutMinutes * 60,
            lockoutCycle: newLockoutCycle,
          },
          HTTP_STATUS_LOCKED,
        );
      } else {
        const remainingAttempts = 5 - newFailedAttempts;

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newFailedAttempts,
            lastFailedLoginAt: new Date(),
          },
        });

        this.logger.warn(
          `Failed password attempt ${newFailedAttempts}/5 for user ${user.employeeCode} from ${ipAddress}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.UNAUTHORIZED,
            error: 'InvalidCredentials',
            message: `Invalid email or password. You have ${remainingAttempts} attempt(s) remaining before temporary lockout.`,
            remainingAttempts,
            failedAttempts: newFailedAttempts,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    // Generate short-lived JWT Access Token (15m)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode,
    };
    const accessToken = this.jwtService.sign(payload);

    // Generate secure random refresh token string and hash it
    const rawRefreshToken = generateSecureToken(48);
    const hashedRefresh = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Transactionally record refresh token, session, and reset lockout state
    await this.prisma.$transaction(async (tx) => {
      // Create new refresh token record
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashedRefresh,
          expiresAt: refreshExpiresAt,
        },
      });

      // Upsert active user session
      await tx.userSession.create({
        data: {
          userId: user.id,
          ipAddress: ipAddress || '127.0.0.1',
          userAgent: userAgent || 'Unknown Client',
          isActive: true,
          lastActiveAt: new Date(),
        },
      });

      // Update user last login timestamp and reset failed attempts / lockout state
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lockoutCycle: 0,
        },
      });
    });

    // Set secure HttpOnly cookie for refresh token
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    this.logger.log(`User ${user.employeeCode} (${user.role}) logged in successfully from ${ipAddress}`);

    const userSummary: UserSummaryDto = {
      id: user.id,
      employeeCode: user.employeeCode,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      isAcceptingLeads: user.isAcceptingLeads,
      lastLoginAt: user.lastLoginAt,
    };

    return {
      accessToken,
      user: userSummary,
    };
  }

  /**
   * Refresh Token Rotation with Automatic Theft Detection
   */
  async refreshTokens(
    rawToken: string,
    ipAddress: string,
    userAgent: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const hashedToken = hashToken(rawToken);

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashedToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // THEFT DETECTION: If a previously revoked token is reused, revoke ALL tokens for this user!
    if (tokenRecord.isRevoked) {
      this.logger.error(
        `SECURITY ALERT: Reused revoked refresh token detected for user ${tokenRecord.user.employeeCode}. Revoking all sessions!`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { isRevoked: true },
      });
      res.clearCookie('refreshToken', { path: '/api/v1/auth' });
      throw new UnauthorizedException('Suspicious session activity detected. Please log in again.');
    }

    // Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('Account is inactive.');
    }

    // ROTATION: Revoke old token and issue a brand-new token pair
    const newRawRefreshToken = generateSecureToken(48);
    const newHashedToken = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          tokenHash: newHashedToken,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    // Issue new access token
    const payload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      employeeCode: tokenRecord.user.employeeCode,
    };
    const newAccessToken = this.jwtService.sign(payload);

    // Update refresh token cookie
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('refreshToken', newRawRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: newAccessToken };
  }

  /**
   * Explicit session logout and cookie clearing
   */
  async logout(userId: string, rawToken: string | undefined, res: Response): Promise<{ message: string }> {
    if (rawToken) {
      const hashedToken = hashToken(rawToken);
      await this.prisma.refreshToken
        .update({
          where: { tokenHash: hashedToken },
          data: { isRevoked: true },
        })
        .catch(() => {});
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    this.logger.log(`User ${userId} logged out.`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Retrieve current authenticated user profile
   */
  async getMe(userId: string): Promise<UserSummaryDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      employeeCode: user.employeeCode,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      isAcceptingLeads: user.isAcceptingLeads,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
