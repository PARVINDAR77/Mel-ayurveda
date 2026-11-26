import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { InitiateReturnDto } from './dto/initiate-return.dto';
import { LogReturnCallDto } from './dto/log-return-call.dto';
import { ResolveReturnDto } from './dto/resolve-return.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType, ReturnReason, ReturnStatus } from '@prisma/client';

@ApiTags('Operations & Returns Management (Bundle 14)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('queue')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'List all active returns awaiting customer outreach and resolution' })
  @ApiResponse({ status: 200, description: 'Active returns queue returned' })
  async getQueue() {
    return this.returnsService.getQueue();
  }

  @Get('history')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'List historical resolved returns with pagination, filters, and search' })
  @ApiResponse({ status: 200, description: 'Return history list returned' })
  async getHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('reason') reason?: ReturnReason,
    @Query('status') status?: ReturnStatus,
    @Query('search') search?: string,
  ) {
    return this.returnsService.getHistory(
      Number(page) || 1,
      Number(limit) || 50,
      reason,
      status,
      search,
    );
  }

  @Get('stats')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Return orders KPI metrics and reason breakdown' })
  @ApiResponse({ status: 200, description: 'Return stats returned' })
  async getStats() {
    return this.returnsService.getStats();
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Get full details of a specific return order' })
  @ApiResponse({ status: 200, description: 'Return order details returned' })
  async findOne(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Post('initiate')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Initiate a return investigation for an undelivered or cancelled order' })
  @ApiResponse({ status: 201, description: 'Return case created and queued' })
  async initiateReturn(
    @Body() dto: InitiateReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.returnsService.initiateReturn(dto, user);
  }

  @Post(':id/call-log')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Log a phone call and verified return reason with the customer' })
  @ApiResponse({ status: 200, description: 'Customer call logged' })
  async logCall(
    @Param('id') id: string,
    @Body() dto: LogReturnCallDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.returnsService.logCall(id, dto, user);
  }

  @Post(':id/resolve')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Resolve return case (Restock inventory, Re-attempt delivery, or Settle)' })
  @ApiResponse({ status: 200, description: 'Return resolved' })
  async resolveReturn(
    @Param('id') id: string,
    @Body() dto: ResolveReturnDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.returnsService.resolveReturn(id, dto, user);
  }
}
