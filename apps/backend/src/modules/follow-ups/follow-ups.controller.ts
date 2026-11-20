import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { RescheduleFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Follow-Up Scheduler Engine (Bundle 08)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Post()
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Schedule a new callback for a patient lead' })
  @ApiResponse({ status: 201, description: 'Follow-up callback scheduled successfully' })
  async createFollowUp(
    @Body() dto: CreateFollowUpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followUpsService.createFollowUp(dto, user);
  }

  @Get('my')
  @Roles(RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({
    summary:
      'List scheduled, due today, and overdue follow-ups with SLA indicators for current user',
  })
  @ApiResponse({ status: 200, description: 'User follow-up agenda returned' })
  async getMyFollowUps(
    @Query() query: FollowUpQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followUpsService.getMyFollowUps(query, user);
  }

  @Get('lead/:leadId')
  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.SALESPERSON,
    RoleType.MANAGEMENT,
    RoleType.PENDING_REVIEWER,
  )
  @ApiOperation({ summary: 'List all follow-up history for a specific lead' })
  @ApiResponse({ status: 200, description: 'Follow-ups for lead returned' })
  async getFollowUpsForLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followUpsService.getFollowUpsForLead(leadId, user);
  }

  @Patch(':id/complete')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Manually mark a scheduled follow-up as completed' })
  @ApiResponse({ status: 200, description: 'Follow-up marked completed' })
  async completeFollowUp(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followUpsService.completeFollowUp(id, user);
  }

  @Patch(':id/cancel')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Cancel a scheduled follow-up' })
  @ApiResponse({ status: 200, description: 'Follow-up cancelled' })
  async cancelFollowUp(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followUpsService.cancelFollowUp(id, reason, user);
  }

  @Patch(':id/reschedule')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Reschedule an existing callback to a new date and time' })
  @ApiResponse({ status: 200, description: 'Follow-up rescheduled' })
  async rescheduleFollowUp(
    @Param('id') id: string,
    @Body() dto: RescheduleFollowUpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followUpsService.rescheduleFollowUp(id, dto, user);
  }
}
