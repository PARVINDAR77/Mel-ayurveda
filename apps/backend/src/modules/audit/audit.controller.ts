import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Enterprise Audit Logging (Bundle 15)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.SUPER_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Query immutable enterprise audit logs (SUPER_ADMIN ONLY)',
  })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-superadmin roles' })
  async findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get quick audit statistics and top actions' })
  @ApiResponse({ status: 200, description: 'Audit summary retrieved' })
  async getSummary() {
    return this.auditService.getSummary();
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get full single audit log entry with state diff' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async findById(@Param('id') id: string) {
    return this.auditService.findById(id);
  }
}
