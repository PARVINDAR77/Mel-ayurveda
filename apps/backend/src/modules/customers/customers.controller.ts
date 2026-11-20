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
import { CustomersService } from './customers.service';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Customer CRM & Conversion Engine (Bundle 11)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post('convert/:leadId')
  @Roles(RoleType.MANAGEMENT, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Convert an APPROVED patient lead into a verified permanent Customer CRM profile',
  })
  @ApiResponse({ status: 201, description: 'Lead converted to customer' })
  async convertLead(
    @Param('leadId') leadId: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.convertLeadToCustomer(leadId, dto, user);
  }

  @Post()
  @Roles(RoleType.MANAGEMENT, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Directly create a new walk-in customer profile' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.createCustomer(dto, user);
  }

  @Get('metrics')
  @Roles(RoleType.MANAGEMENT, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve customer CRM KPIs (Total, Converted, New this month)' })
  @ApiResponse({ status: 200, description: 'Metrics returned' })
  async getMetrics() {
    return this.customersService.getMetrics();
  }

  @Get()
  @Roles(RoleType.MANAGEMENT, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List customer CRM profiles with search and pagination' })
  @ApiResponse({ status: 200, description: 'Customers returned' })
  async findAll(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @Roles(RoleType.MANAGEMENT, RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Retrieve comprehensive customer CRM profile with lifetime orders and clinical origin trail',
  })
  @ApiResponse({ status: 200, description: 'Customer profile returned' })
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleType.MANAGEMENT, RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update customer contact or delivery address' })
  @ApiResponse({ status: 200, description: 'Customer profile updated' })
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.updateCustomer(id, dto, user);
  }
}
