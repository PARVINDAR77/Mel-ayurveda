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
import { OrdersService } from './orders.service';
import { CreateDraftOrderDto } from './dto/create-draft-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DecideOrderDto } from './dto/decide-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { BulkImportOrdersDto } from './dto/bulk-import-orders.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Ayurvedic Orders & Stock Reservation (Bundle 12)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('draft')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT, RoleType.FOLLOWUP_EXECUTIVE)
  @ApiOperation({
    summary:
      'Create a draft order for a verified customer with Ayurvedic formulations and dosage instructions',
  })
  @ApiResponse({ status: 201, description: 'Draft order created' })
  async createDraftOrder(
    @Body() dto: CreateDraftOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.createDraftOrder(dto, user);
  }

  @Post('bulk-import')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON)
  @ApiOperation({ summary: 'Bulk import historical orders from Excel / CSV spreadsheet' })
  @ApiResponse({ status: 200, description: 'Orders bulk imported successfully' })
  async bulkImportOrders(
    @Body() dto: BulkImportOrdersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.bulkImportOrders(dto, user);
  }

  @Post(':id/confirm')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER)
  @ApiOperation({
    summary: 'Finalize and confirm order with atomic warehouse inventory reservation',
  })
  @ApiResponse({ status: 200, description: 'Order confirmed and inventory reserved' })
  async confirmOrder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.confirmOrder(id, user);
  }

  @Post(':id/decide')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER)
  @ApiOperation({
    summary: 'Decide on order: CONFIRM, REJECT, or REQUEST_RECTIFICATION with structured remarks',
  })
  @ApiResponse({ status: 200, description: 'Order decision recorded' })
  async decideOrder(
    @Param('id') id: string,
    @Body() dto: DecideOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.decideOrder(id, dto, user);
  }

  @Patch(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER, RoleType.SALESPERSON)
  @ApiOperation({
    summary: 'Update order formulations, items, custom pricing, delivery address, or approver notes',
  })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateOrder(id, dto, user);
  }

  @Get('by-lead/:leadId')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER, RoleType.PENDING_REVIEWER)
  @ApiOperation({ summary: 'Retrieve latest formulation order linked to a lead' })
  @ApiResponse({ status: 200, description: 'Linked order returned' })
  async findByLeadId(@Param('leadId') leadId: string) {
    return this.ordersService.findByLeadId(leadId);
  }

  @Get('metrics')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER)
  @ApiOperation({ summary: 'Retrieve order metrics for operations dashboard' })
  @ApiResponse({ status: 200, description: 'Metrics returned' })
  async getMetrics() {
    return this.ordersService.getMetrics();
  }

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER, RoleType.FOLLOWUP_EXECUTIVE)
  @ApiOperation({ summary: 'List customer orders with status filters and search' })
  @ApiResponse({ status: 200, description: 'Orders returned' })
  async findAll(@Query() query: OrderQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findAll(query, user);
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER, RoleType.FOLLOWUP_EXECUTIVE)
  @ApiOperation({ summary: 'Retrieve full order details with customer, items, and logistics' })
  @ApiResponse({ status: 200, description: 'Order details returned' })
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/cancel')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.APPROVAL_OFFICER)
  @ApiOperation({ summary: 'Cancel an order and release reserved stock back to available' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelOrder(id, reason, user);
  }
}
