import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WafService, WafMetrics } from './waf.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

export class ManageIpDto {
  ip: string;
  reason?: string;
}

@ApiTags('Security & Firewall (WAF)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.SUPER_ADMIN)
@Controller('waf')
export class WafController {
  constructor(private readonly wafService: WafService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get real-time Web Application Firewall (WAF) metrics and active bans' })
  @ApiResponse({ status: 200, description: 'Live WAF telemetry retrieved' })
  getStatus(): WafMetrics {
    return this.wafService.getMetrics();
  }

  @Post('unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually unban an IP address' })
  unban(@Body() dto: ManageIpDto): { success: boolean; message: string } {
    if (!dto.ip || !dto.ip.trim()) {
      throw new BadRequestException('IP address is required');
    }
    const cleanIp = dto.ip.trim();
    const removed = this.wafService.unbanIp(cleanIp);
    return {
      success: true,
      message: removed
        ? `IP [${cleanIp}] successfully unbanned and counters reset.`
        : `IP [${cleanIp}] was not in the active ban list.`,
    };
  }

  @Post('blacklist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently blacklist an IP address' })
  blacklist(@Body() dto: ManageIpDto): { success: boolean; message: string } {
    if (!dto.ip || !dto.ip.trim()) {
      throw new BadRequestException('IP address is required');
    }
    const cleanIp = dto.ip.trim();
    this.wafService.blacklistIp(cleanIp, dto.reason || 'Manually blacklisted by Super Admin');
    return {
      success: true,
      message: `IP [${cleanIp}] permanently blacklisted.`,
    };
  }

  @Post('whitelist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a trusted IP to the permanent whitelist' })
  whitelist(@Body() dto: ManageIpDto): { success: boolean; message: string } {
    if (!dto.ip || !dto.ip.trim()) {
      throw new BadRequestException('IP address is required');
    }
    const cleanIp = dto.ip.trim();
    this.wafService.whitelistIp(cleanIp);
    return {
      success: true,
      message: `IP [${cleanIp}] added to trusted whitelist.`,
    };
  }
}
