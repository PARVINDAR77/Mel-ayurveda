import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { LogOFDCallDto, EscalateToRtoDto } from './dto/ofd-calling.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType, ShipmentStatus } from '@prisma/client';

@ApiTags('Operations & Courier Dispatch (Bundle 13)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON, RoleType.BILLING_EXECUTIVE)
  @ApiOperation({ summary: 'List all consignment shipments with pagination' })
  @ApiResponse({ status: 200, description: 'Shipments list returned' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ShipmentStatus,
  ) {
    return this.dispatchService.findAll(Number(page) || 1, Number(limit) || 20, status);
  }

  @Get('ready-orders')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'List all confirmed formulation orders awaiting courier dispatch' })
  @ApiResponse({ status: 200, description: 'List of confirmed unmanifested orders' })
  async getReadyOrders() {
    return this.dispatchService.getReadyOrders();
  }

  @Post(':orderId')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Assign courier partner and AWB tracking number to dispatch order' })
  @ApiResponse({ status: 201, description: 'Shipment created and order marked SHIPPED' })
  async createShipment(
    @Param('orderId') orderId: string,
    @Body() dto: CreateShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dispatchService.createShipment(orderId, dto, user);
  }

  @Patch(':id/status')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({
    summary:
      'Update shipment tracking status (MANIFESTED, IN_TRANSIT, DELIVERED, RTO) with inventory fulfillment',
  })
  @ApiResponse({ status: 200, description: 'Shipment status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dispatchService.updateStatus(id, dto, user);
  }

  @Get('order/:orderId')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON)
  @ApiOperation({ summary: 'Retrieve consignment tracking details for an order' })
  @ApiResponse({ status: 200, description: 'Shipment returned' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.dispatchService.findByOrderId(orderId);
  }

  // ==========================================
  // OFD (OUT FOR DELIVERY) CALLING & CONFIRMATION
  // ==========================================

  @Get('ofd/queue')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON)
  @ApiOperation({ summary: 'List shipments in OFD calling queue with filters' })
  @ApiResponse({ status: 200, description: 'OFD queue returned' })
  async getOfdQueue(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('courierPartner') courier?: string,
    @Query('ofdStatus') ofdStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.dispatchService.getOfdQueue(
      Number(page) || 1,
      Number(limit) || 50,
      courier,
      ofdStatus,
      search,
    );
  }

  @Get('ofd/stats')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Summary metrics for OFD delivery calling desk' })
  @ApiResponse({ status: 200, description: 'OFD stats returned' })
  async getOfdStats() {
    return this.dispatchService.getOfdStats();
  }

  @Post('ofd/:id/log-call')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON)
  @ApiOperation({ summary: 'Log doorstep customer call outcome and reasons' })
  @ApiResponse({ status: 200, description: 'OFD call logged and transitions applied' })
  async logOfdCall(
    @Param('id') id: string,
    @Body() dto: LogOFDCallDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dispatchService.logOfdCall(id, dto, user);
  }

  @Post('ofd/:id/confirm-delivery')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Direct confirmation of delivered parcel with COD collection' })
  @ApiResponse({ status: 200, description: 'Delivery confirmed and stock fulfilled' })
  async confirmOfdDelivery(
    @Param('id') id: string,
    @Body('codAmountCollected') codAmount?: number,
    @Body('notes') notes?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.dispatchService.confirmOfdDelivery(id, codAmount, notes, user);
  }

  @Post('ofd/:id/escalate-to-rto')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Escalate doorstep refused parcel directly to Return & RTO desk' })
  @ApiResponse({ status: 200, description: 'Escalated to RTO queue' })
  async escalateToRto(
    @Param('id') id: string,
    @Body() dto: EscalateToRtoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dispatchService.escalateToRto(id, dto, user);
  }
}
