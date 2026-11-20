import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeadSourcesService } from './lead-sources.service';
import { CreateLeadSourceDto, UpdateLeadSourceDto } from './dto/create-lead-source.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Lead Sources & Marketing Channels (Bundle 04)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lead-sources')
export class LeadSourcesController {
  constructor(private readonly leadSourcesService: LeadSourcesService) {}

  @Post()
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Register new lead acquisition source (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Source registered' })
  async create(@Body() dto: CreateLeadSourceDto) {
    return this.leadSourcesService.create(dto);
  }

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT) // SALESPERSON IS STRICTLY FORBIDDEN!
  @ApiOperation({ summary: 'List lead sources (Forbidden to Salesperson)' })
  @ApiResponse({ status: 200, description: 'Lead sources returned' })
  @ApiResponse({ status: 403, description: 'Forbidden to Salesperson' })
  async findAll() {
    return this.leadSourcesService.findAll();
  }

  @Get('analytics/summary')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT) // SALESPERSON IS STRICTLY FORBIDDEN!
  @ApiOperation({ summary: 'Lead source conversion and intake analytics' })
  async getAnalyticsSummary() {
    return this.leadSourcesService.getAnalyticsSummary();
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Get specific source details' })
  async findById(@Param('id') id: string) {
    return this.leadSourcesService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update source details' })
  async update(@Param('id') id: string, @Body() dto: UpdateLeadSourceDto) {
    return this.leadSourcesService.update(id, dto);
  }
}
