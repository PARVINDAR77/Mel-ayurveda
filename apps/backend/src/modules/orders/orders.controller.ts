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
import { OrderQueryDto } from './dto/order-query.dto';
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
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
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

  @Post(':id/confirm')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
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

  @Get('metrics')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve order metrics for operations dashboard' })
  @ApiResponse({ status: 200, description: 'Metrics returned' })
  async getMetrics() {
    return this.ordersService.getMetrics();
  }

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'List customer orders with status filters and search' })
  @ApiResponse({ status: 200, description: 'Orders returned' })
  async findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.SALESPERSON, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Retrieve full order details with customer, items, and logistics' })
  @ApiResponse({ status: 200, description: 'Order details returned' })
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/cancel')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
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
