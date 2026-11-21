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
import { PendingReviewsService } from './pending-reviews.service';
import { SubmitPendingReviewDto } from './dto/submit-pending-review.dto';
import { DecidePendingReviewDto } from './dto/decide-pending-review.dto';
import { PendingQueueQueryDto, PendingQueueFilter } from './dto/pending-queue-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Pending Review Workflow (Bundle 09)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pending-reviews')
export class PendingReviewsController {
  constructor(private readonly pendingReviewsService: PendingReviewsService) {}

  @Post('submit')
  @Roles(RoleType.SALESPERSON, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Submit an active lead to Pending Review triage queue' })
  @ApiResponse({ status: 201, description: 'Lead submitted to pending queue' })
  async submitReview(
    @Body() dto: SubmitPendingReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pendingReviewsService.submitPendingReview(dto, user);
  }

  @Get('queue')
  @Roles(RoleType.PENDING_REVIEWER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve centralized pending triage queue' })
  @ApiResponse({ status: 200, description: 'Queue items returned' })
  async getQueue(@Query() query: PendingQueueQueryDto) {
    return this.pendingReviewsService.getQueue(query);
  }

  @Get('history')
  @Roles(RoleType.PENDING_REVIEWER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve resolved pending review history' })
  @ApiResponse({ status: 200, description: 'Review decision history returned' })
  async getHistory(@Query() query: PendingQueueQueryDto) {
    return this.pendingReviewsService.getQueue({
      ...query,
      filter: PendingQueueFilter.DECIDED,
    });
  }

  @Get('metrics')
  @Roles(RoleType.PENDING_REVIEWER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve pending panel KPI metrics (Total, Overdue, In-Review, Completed)' })
  @ApiResponse({ status: 200, description: 'Metrics returned' })
  async getMetrics() {
    return this.pendingReviewsService.getMetrics();
  }

  @Get('lead/:leadId')
  @Roles(
    RoleType.PENDING_REVIEWER,
    RoleType.SUPER_ADMIN,
    RoleType.MANAGEMENT,
    RoleType.SALESPERSON,
  )
  @ApiOperation({ summary: 'Retrieve review history for a specific lead' })
  @ApiResponse({ status: 200, description: 'Lead reviews returned' })
  async getReviewsForLead(@Param('leadId') leadId: string) {
    return this.pendingReviewsService.getReviewsForLead(leadId);
  }

  @Get(':id')
  @Roles(RoleType.PENDING_REVIEWER, RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve comprehensive clinical & commercial audit dossier for review' })
  @ApiResponse({ status: 200, description: 'Full review dossier returned' })
  async getReviewDossier(@Param('id') id: string) {
    return this.pendingReviewsService.getReviewDossier(id);
  }

  @Patch(':id/claim')
  @Roles(RoleType.PENDING_REVIEWER, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Claim and lock an unclaimed pending lead into UNDER_REVIEW' })
  @ApiResponse({ status: 200, description: 'Lead review claimed and locked' })
  async claimReview(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pendingReviewsService.claimReview(id, user);
  }

  @Post(':id/decide')
  @Roles(RoleType.PENDING_REVIEWER, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Execute 4-way pending decision: APPROVE (forward to approvals), REJECT, REQUEST_FOLLOW_UP, SEND_BACK',
  })
  @ApiResponse({ status: 200, description: 'Review resolved and lead state transitioned' })
  async decideReview(
    @Param('id') id: string,
    @Body() dto: DecidePendingReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pendingReviewsService.decideReview(id, dto, user);
  }
}
