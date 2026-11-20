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
import { LeadsService } from './leads.service';
import { CreateManualLeadDto, UpdateLeadDto } from './dto/create-manual-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Lead Management & Intake (Bundle 05)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('manual')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT)
  @ApiOperation({ summary: 'Manually create lead (Super Admin / Management)' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  async createManualLead(
    @Body() dto: CreateManualLeadDto,
    @CurrentUser('id') creatorId: string,
  ) {
    return this.leadsService.createManualLead(dto, creatorId);
  }

  @Get('check-duplicate')
  @ApiOperation({ summary: 'Check if phone number already exists within 30 days' })
  async checkDuplicate(@Query('phone') phone: string) {
    return this.leadsService.checkDuplicate(phone || '');
  }

  @Get()
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON)
  @ApiOperation({ summary: 'List leads (Salesperson views assigned only with sources strictly hidden)' })
  @ApiResponse({ status: 200, description: 'Leads returned' })
  async findAll(
    @Query() query: LeadQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.findAll(query, user.role as RoleType, user.id);
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON, RoleType.PENDING_REVIEWER, RoleType.APPROVAL_OFFICER)
  @ApiOperation({ summary: 'Get lead dossier (Enforces anti-IDOR for salesperson & source masking)' })
  @ApiResponse({ status: 200, description: 'Lead details returned' })
  @ApiResponse({ status: 403, description: 'IDOR Forbidden for unauthorized salesperson' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.findById(id, user.role as RoleType, user.id);
  }

  @Patch(':id')
  @Roles(RoleType.SUPER_ADMIN, RoleType.MANAGEMENT, RoleType.SALESPERSON)
  @ApiOperation({ summary: 'Update permitted lead attributes' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  async updateLead(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.updateLead(id, dto, user.role as RoleType, user.id);
  }
}
