import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeadAssignmentsService } from './lead-assignments.service';
import { AssignLeadDto, BulkAssignDto, ReassignLeadDto } from './dto/assign-lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Lead Distribution & Assignment Engine (Bundle 06)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lead-assignments')
export class LeadAssignmentsController {
  constructor(private readonly assignmentsService: LeadAssignmentsService) {}

  @Post('assign')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign a single lead to a salesperson' })
  @ApiResponse({ status: 200, description: 'Lead assigned successfully' })
  async assignLead(
    @Body() dto: AssignLeadDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.assignmentsService.assignLead(dto, actorId);
  }

  @Post('bulk')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk assign multiple leads to a salesperson' })
  @ApiResponse({ status: 200, description: 'Leads bulk assigned' })
  async bulkAssign(
    @Body() dto: BulkAssignDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.assignmentsService.bulkAssign(dto, actorId);
  }

  @Post('reassign')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reassign an existing lead with mandatory audit reason' })
  @ApiResponse({ status: 200, description: 'Lead reassigned and history preserved' })
  async reassignLead(
    @Body() dto: ReassignLeadDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.assignmentsService.reassignLead(dto, actorId);
  }

  @Post('distribute/round-robin')
  @Roles(RoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger automated round-robin lead distribution among active salespeople' })
  @ApiResponse({ status: 200, description: 'Leads distributed via round-robin' })
  async distributeRoundRobin(@CurrentUser('id') actorId: string) {
    return this.assignmentsService.distributeRoundRobin(actorId);
  }

  @Get('unassigned')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'View the unassigned lead intake queue' })
  async getUnassignedQueue() {
    return this.assignmentsService.getUnassignedQueue();
  }

  @Get('lead/:leadId')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Get full chronological assignment audit history for a lead' })
  async getAssignmentHistory(@Param('leadId') leadId: string) {
    return this.assignmentsService.getAssignmentHistory(leadId);
  }
}
