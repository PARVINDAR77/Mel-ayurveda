import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Operations & GST Invoicing (Bundle 13)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('billing-queue')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.BILLING_EXECUTIVE)
  @ApiOperation({ summary: 'Retrieve confirmed formulation orders awaiting GST tax billing' })
  @ApiResponse({ status: 200, description: 'Billing queue returned' })
  async getBillingQueue(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.getBillingQueue(
      Number(page) || 1,
      Number(limit) || 50,
      search,
    );
  }

  @Get('billing-stats')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.BILLING_EXECUTIVE)
  @ApiOperation({ summary: 'KPI metrics for the Billing Workspace' })
  @ApiResponse({ status: 200, description: 'Billing KPI metrics returned' })
  async getBillingStats() {
    return this.invoicesService.getBillingStats();
  }

  @Post('generate/:orderId')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.BILLING_EXECUTIVE)
  @ApiOperation({
    summary:
      'Generate compliant GST tax invoice with automatic CGST/SGST vs IGST calculation based on shipping state',
  })
  @ApiResponse({ status: 201, description: 'GST invoice generated' })
  async generateInvoice(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.generateInvoice(orderId, user);
  }

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.BILLING_EXECUTIVE)
  @ApiOperation({ summary: 'List all generated GST tax invoices' })
  @ApiResponse({ status: 200, description: 'Invoices list returned' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoicesService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Get('order/:orderId')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON, RoleType.BILLING_EXECUTIVE)
  @ApiOperation({ summary: 'Retrieve invoice for a specific order' })
  @ApiResponse({ status: 200, description: 'Invoice returned' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.invoicesService.findByOrderId(orderId);
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON, RoleType.BILLING_EXECUTIVE)
  @ApiOperation({ summary: 'Retrieve invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice returned' })
  async findById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }
}
