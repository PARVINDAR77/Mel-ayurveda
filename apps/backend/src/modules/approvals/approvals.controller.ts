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
import { ApprovalsService } from './approvals.service';
import { DecideApprovalDto } from './dto/decide-approval.dto';
import { ApprovalQueueQueryDto } from './dto/approval-queue-query.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Final Approval Engine (Bundle 10)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('submit')
  @Roles(RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.PENDING_REVIEWER, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Submit an approved customer deal directly to Panel 04 Approval Officer queue' })
  @ApiResponse({ status: 201, description: 'Submitted to approval queue' })
  async submitApproval(
    @Body() dto: SubmitApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.submitApproval(dto, user);
  }

  @Get('queue')
  @Roles(RoleType.APPROVAL_OFFICER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve centralized commercial & medical approval queue' })
  @ApiResponse({ status: 200, description: 'Approval requests returned' })
  async getQueue(@Query() query: ApprovalQueueQueryDto) {
    return this.approvalsService.getQueue(query);
  }

  @Get('metrics')
  @Roles(RoleType.APPROVAL_OFFICER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve approval panel KPI metrics (Total, New, Under-Review, Approved Today)' })
  @ApiResponse({ status: 200, description: 'Metrics returned' })
  async getMetrics() {
    return this.approvalsService.getMetrics();
  }

  @Get('lead/:leadId')
  @Roles(RoleType.APPROVAL_OFFICER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve approval request history for a specific lead' })
  @ApiResponse({ status: 200, description: 'Lead approval history returned' })
  async getApprovalsForLead(@Param('leadId') leadId: string) {
    return this.approvalsService.getApprovalsForLead(leadId);
  }

  @Get(':id')
  @Roles(RoleType.APPROVAL_OFFICER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve full verification dossier for medical/commercial inspection' })
  @ApiResponse({ status: 200, description: 'Approval dossier returned' })
  async getApprovalDossier(@Param('id') id: string) {
    return this.approvalsService.getApprovalDossier(id);
  }

  @Patch(':id/claim')
  @Roles(RoleType.APPROVAL_OFFICER, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Claim an approval request to lock it against concurrency collisions' })
  @ApiResponse({ status: 200, description: 'Approval request claimed' })
  async claimApproval(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.claimApproval(id, user);
  }

  @Post(':id/decide')
  @Roles(RoleType.APPROVAL_OFFICER, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Execute final sign-off decision: APPROVE (unlocks customer conversion), REJECT, or SEND_BACK',
  })
  @ApiResponse({ status: 200, description: 'Approval decision recorded' })
  async decideApproval(
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.decideApproval(id, dto, user);
  }
}
