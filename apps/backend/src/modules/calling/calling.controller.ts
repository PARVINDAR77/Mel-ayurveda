import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CallingService } from './calling.service';
import { CreateCallLogDto } from './dto/create-call-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Calling Management Engine (Bundle 07)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calling')
export class CallingController {
  constructor(private readonly callingService: CallingService) {}

  @Post('logs')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
  @ApiOperation({
    summary: 'Record an append-only telephonic call log with consultation notes and outcome',
  })
  @ApiResponse({ status: 201, description: 'Call log recorded and lead state updated' })
  async recordCall(
    @Body() dto: CreateCallLogDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.callingService.createCallLog(dto, user);
  }

  @Get('logs/lead/:leadId')
  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.SALESPERSON,
    RoleType.PENDING_REVIEWER,
    RoleType.APPROVAL_OFFICER,
    RoleType.MANAGEMENT,
  )
  @ApiOperation({ summary: 'Retrieve chronological call history for a customer product lead' })
  @ApiResponse({ status: 200, description: 'Call logs history returned' })
  async getLeadCallLogs(
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.callingService.getLogsForLead(leadId, user);
  }

  @Get('analytics/my')
  @Roles(RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve personal call statistics, talk time, and outcome metrics' })
  @ApiResponse({ status: 200, description: 'Personal calling analytics returned' })
  async getMyAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.callingService.getMyCallingAnalytics(user);
  }
}
