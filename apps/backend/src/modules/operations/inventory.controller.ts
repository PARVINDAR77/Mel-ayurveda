import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { RestockInventoryDto } from './dto/restock-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Operations & Warehouse Inventory (Bundle 13)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'View warehouse stock levels across all SKUs with low-stock alerts' })
  @ApiResponse({ status: 200, description: 'Inventory stock levels returned' })
  async getInventoryLevels() {
    return this.inventoryService.getInventoryLevels();
  }

  @Post('restock')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Record warehouse replenishment from factory / manufacturing batches' })
  @ApiResponse({ status: 201, description: 'Stock restocked and ledger updated' })
  async restock(
    @Body() dto: RestockInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.restock(dto, user);
  }

  @Get('transactions')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Query chronological warehouse inventory transaction history' })
  @ApiResponse({ status: 200, description: 'Transactions returned' })
  async getTransactions(
    @Query('productId') productId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getTransactions(
      productId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }
}
