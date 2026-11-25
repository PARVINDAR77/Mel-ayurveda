import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Ayurvedic Products & Disease Categories (Bundle 12)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.SALESPERSON,
    RoleType.PENDING_REVIEWER,
    RoleType.APPROVAL_OFFICER,
    RoleType.MANAGEMENT,
  )
  @ApiOperation({ summary: 'List all therapeutic disease categories' })
  @ApiResponse({ status: 200, description: 'Product categories returned' })
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Post('categories')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Create a new therapeutic disease category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.productsService.createCategory(name, description);
  }

  @Patch('categories/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Update a therapeutic disease category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('description') description?: string,
    @Body('isActive') isActive?: boolean,
  ) {
    return this.productsService.updateCategory(id, name, description, isActive);
  }

  @Delete('categories/:id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Delete a therapeutic disease category' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async deleteCategory(
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    return this.productsService.deleteCategory(id, force === 'true');
  }

  @Get()
  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.SALESPERSON,
    RoleType.PENDING_REVIEWER,
    RoleType.APPROVAL_OFFICER,
    RoleType.MANAGEMENT,
  )
  @ApiOperation({ summary: 'List disease-categorized Ayurvedic products with live inventory levels' })
  @ApiResponse({ status: 200, description: 'Products returned' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('generate-sku')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Generate next available sequential product SKU code' })
  @ApiResponse({ status: 200, description: 'Generated SKU code' })
  async generateSku() {
    const sku = await this.productsService.generateNextSku();
    return { sku };
  }

  @Get(':id')
  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.SALESPERSON,
    RoleType.PENDING_REVIEWER,
    RoleType.APPROVAL_OFFICER,
    RoleType.MANAGEMENT,
  )
  @ApiOperation({ summary: 'Get Ayurvedic formulation details' })
  @ApiResponse({ status: 200, description: 'Product returned' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Register new formulation SKU, MRP, GST rate and initial stock' })
  @ApiResponse({ status: 201, description: 'Product registered' })
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.createProduct(dto, user);
  }

  @Patch(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Update formulation pricing or active status' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.updateProduct(id, dto, user);
  }

  @Delete(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Delete or archive an Ayurvedic product formulation' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async deleteProduct(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.deleteProduct(id, force === 'true', user);
  }
}
