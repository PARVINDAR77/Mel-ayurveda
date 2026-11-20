import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
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
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'List all consignment shipments with pagination' })
  @ApiResponse({ status: 200, description: 'Shipments list returned' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ShipmentStatus,
  ) {
    return this.dispatchService.findAll(Number(page) || 1, Number(limit) || 20, status);
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
}
