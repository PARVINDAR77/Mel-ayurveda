import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, UserSummaryDto } from './dto/auth-response.dto';
import { verifyPassword, generateSecureToken, hashToken } from '../../common/utils/password.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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

    const isPasswordValid = await verifyPassword(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed password verification for user ${user.employeeCode} from ${ipAddress}`);
      throw new UnauthorizedException('Invalid email or password');
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

    // Transactionally record refresh token, session, and update lastLoginAt
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

      // Update user last login timestamp
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
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
