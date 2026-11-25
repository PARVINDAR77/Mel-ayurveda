import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecycleBinService } from './recycle-bin.service';
import { RecycleBinQueryDto } from './dto/recycle-bin-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Recycle Bin & 30-Day Recovery Vault')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recycle-bin')
export class RecycleBinController {
  constructor(private readonly recycleBinService: RecycleBinService) {}

  @Get('metrics')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve summary metrics and countdown status for recovery vault' })
  @ApiResponse({ status: 200, description: 'Vault metrics returned' })
  async getMetrics() {
    return this.recycleBinService.getMetrics();
  }

  @Get()
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all archived records in 30-day vault with search and entity filters' })
  @ApiResponse({ status: 200, description: 'Vault items returned' })
  async findAll(@Query() query: RecycleBinQueryDto) {
    return this.recycleBinService.findAll(query);
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve full snapshot and properties of an archived vault item' })
  @ApiResponse({ status: 200, description: 'Vault item details returned' })
  async findById(@Param('id') id: string) {
    return this.recycleBinService.findById(id);
  }

  @Post(':id/restore')
  @Roles(RoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived record back to the live operational database' })
  @ApiResponse({ status: 200, description: 'Record restored successfully' })
  @ApiResponse({ status: 409, description: 'Collision detected: Email or identifier occupied' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recycleBinService.restoreRecord(id, user.id, user.employeeCode);
  }

  @Delete(':id/purge')
  @Roles(RoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force permanent purge of an item ahead of 30-day retention window' })
  @ApiResponse({ status: 200, description: 'Record permanently purged' })
  async permanentPurge(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recycleBinService.permanentPurge(id, user.id, user.employeeCode);
  }

  @Post('cron/purge-expired')
  @Roles(RoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger 30-day automated purge lifecycle worker' })
  @ApiResponse({ status: 200, description: 'Expired records purged' })
  async purgeExpired() {
    return this.recycleBinService.purgeExpiredRecords();
  }
}
