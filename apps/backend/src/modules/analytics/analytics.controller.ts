import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Executive Dashboards & Analytics (Bundle 14)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Auto-resolved role dashboard for the currently authenticated employee',
  })
  @ApiResponse({ status: 200, description: 'Role dashboard retrieved successfully' })
  async getMyDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getDashboard(user);
  }

  @Get('dashboard/admin')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin master executive dashboard & lead source ROI' })
  @ApiResponse({ status: 200, description: 'Admin dashboard metrics retrieved' })
  async getAdminDashboard() {
    return this.analyticsService.getAdminDashboard();
  }

  @Get('dashboard/sales')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON)
  @ApiOperation({
    summary:
      'Salesperson performance dashboard (MANDATORY INVARIANT: STRICT ZERO LEAD SOURCE DATA)',
  })
  @ApiResponse({ status: 200, description: 'Salesperson metrics retrieved' })
  async getSalesDashboard(
    @CurrentUser() user: any,
    @Query('salespersonId') salespersonId?: string,
  ) {
    if (user.role === RoleType.SALESPERSON) {
      // Anti-IDOR: Salesperson can only view their own dashboard
      return this.analyticsService.getSalesDashboard(user.id);
    }
    // Admin can view specific salesperson or default to first/none
    const targetId = salespersonId || user.id;
    return this.analyticsService.getSalesDashboard(targetId);
  }

  @Get('dashboard/pending')
  @Roles(RoleType.SUPER_ADMIN, RoleType.PENDING_REVIEWER)
  @ApiOperation({ summary: 'Pending Review triage queue velocity & SLA breakdown' })
  @ApiResponse({ status: 200, description: 'Pending Review metrics retrieved' })
  async getPendingDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getPendingReviewDashboard(user.id);
  }

  @Get('dashboard/approval')
  @Roles(RoleType.SUPER_ADMIN, RoleType.APPROVAL_OFFICER)
  @ApiOperation({ summary: 'Approval Authority medical/commercial sign-off metrics' })
  @ApiResponse({ status: 200, description: 'Approval Authority metrics retrieved' })
  async getApprovalDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getApprovalDashboard(user.id);
  }

  @Get('dashboard/management')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({
    summary: 'Management operations, customer CRM, GST billing & inventory health',
  })
  @ApiResponse({ status: 200, description: 'Management operations metrics retrieved' })
  async getManagementDashboard() {
    return this.analyticsService.getManagementDashboard();
  }

  @Get('staff-activity')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({
    summary: 'Team-wide staff daily and monthly activity, performance & incentive metrics',
  })
  @ApiResponse({ status: 200, description: 'Staff activity metrics retrieved successfully' })
  async getStaffDailyActivity(
    @Query('mode') mode?: 'daily' | 'monthly',
    @Query('date') date?: string,
    @Query('month') month?: string,
    @Query('role') role?: RoleType,
  ) {
    return this.analyticsService.getStaffDailyActivity({ mode, date, month, role });
  }

  @Get('staff-activity/:userId/day-log')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({
    summary: 'Granular chronological day log and dossier for a specific staff member',
  })
  @ApiResponse({ status: 200, description: 'Staff day log retrieved successfully' })
  async getStaffDayLog(
    @Param('userId') userId: string,
    @Query('date') date?: string,
  ) {
    return this.analyticsService.getStaffDayLog(userId, date);
  }
}
