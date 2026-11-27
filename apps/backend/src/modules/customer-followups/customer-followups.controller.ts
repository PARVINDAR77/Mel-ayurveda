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
import { CustomerFollowupsService } from './customer-followups.service';
import { BatchAssignCustomerFollowUpDto } from './dto/batch-assign-customer-follow-up.dto';
import { LogCustomerFollowUpDto } from './dto/log-customer-follow-up.dto';
import { UpdateFollowUpStatusDto } from './dto/update-follow-up-status.dto';
import { CustomerFollowUpQueryDto } from './dto/customer-follow-up-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Customer Care & Post-Sales Follow-Up (Bundle 15)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customer-followups')
export class CustomerFollowupsController {
  constructor(private readonly service: CustomerFollowupsService) {}

  @Get('executives')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'List active executives eligible to receive follow-up assignments' })
  @ApiResponse({ status: 200, description: 'Executives returned' })
  async getExecutives() {
    return this.service.getFollowUpExecutives();
  }

  @Post('batch')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Super Admin batch manual assignment of clients to follow-up executive' })
  @ApiResponse({ status: 201, description: 'Batch assigned successfully' })
  async batchAssign(
    @Body() dto: BatchAssignCustomerFollowUpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.batchAssign(dto, user);
  }

  @Get('my')
  @Roles(RoleType.FOLLOWUP_EXECUTIVE, RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve follow-up agenda & client orders for current user' })
  @ApiResponse({ status: 200, description: 'Follow-ups returned' })
  async getMyFollowUps(
    @Query() query: CustomerFollowUpQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getMyFollowUps(query, user);
  }

  @Get('all')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Super Admin & Management master overview of all client follow-ups' })
  @ApiResponse({ status: 200, description: 'Master follow-ups returned' })
  async getAllFollowUps(@Query() query: CustomerFollowUpQueryDto) {
    return this.service.getAllFollowUps(query);
  }

  @Get(':id')
  @Roles(RoleType.FOLLOWUP_EXECUTIVE, RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve detailed client dossier, past orders, and consultation logs' })
  @ApiResponse({ status: 200, description: 'Follow-up detail returned' })
  async getFollowUpById(@Param('id') id: string) {
    return this.service.getFollowUpById(id);
  }

  @Post(':id/log')
  @Roles(RoleType.FOLLOWUP_EXECUTIVE, RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Log consultation notes, symptom relief rating, and schedule next check-in' })
  @ApiResponse({ status: 201, description: 'Consultation notes recorded' })
  async logConsultation(
    @Param('id') id: string,
    @Body() dto: LogCustomerFollowUpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.logConsultation(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(RoleType.FOLLOWUP_EXECUTIVE, RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Update customer follow-up status (e.g. PENDING to COMPLETED, RESCHEDULED, etc.)' })
  @ApiResponse({ status: 200, description: 'Follow-up status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFollowUpStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateFollowUpStatus(id, dto, user);
  }
}
