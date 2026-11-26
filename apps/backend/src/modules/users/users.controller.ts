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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { ToggleStatusDto, ResetPasswordDto } from './dto/toggle-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('Employees & User Administration (Bundle 02)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List employees with pagination, search, and role filtering' })
  @ApiResponse({ status: 200, description: 'Employees retrieved successfully' })
  async findAll(@Query() query: EmployeeQueryDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new employee with auto-generated sequential ID' })
  @ApiResponse({ status: 201, description: 'Employee created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.createEmployee(dto, actorId);
  }

  @Get(':id')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get employee details by ID' })
  @ApiResponse({ status: 200, description: 'Employee details returned' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':id/activity')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get full employee work activity, performance metrics, and dossier' })
  @ApiResponse({ status: 200, description: 'Employee activity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployeeActivity(@Param('id') id: string) {
    return this.usersService.getEmployeeActivity(id);
  }

  @Patch(':id')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update employee information' })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.updateEmployee(id, dto, actorId);
  }

  @Patch(':id/status')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate or deactivate employee account (revokes sessions if deactivated)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async toggleStatus(
    @Param('id') id: string,
    @Body() dto: ToggleStatusDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.toggleStatus(id, dto, actorId);
  }

  @Patch(':id/toggle-status')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Alias for status toggle' })
  async toggleStatusAlias(
    @Param('id') id: string,
    @Body() dto: ToggleStatusDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.toggleStatus(id, dto, actorId);
  }

  @Post(':id/reset-password')
  @Roles(RoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Administrative password reset for employee' })
  @ApiResponse({ status: 200, description: 'Password reset and sessions revoked' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('id') actorId: string,
  ) {
    const pwd = dto.newPassword || dto.password;
    if (!pwd) {
      throw new BadRequestException('newPassword or password is required');
    }
    return this.usersService.resetPassword(id, pwd, actorId);
  }

  @Delete(':id')
  @Roles(RoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete an employee record' })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete self or root admin' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async deleteEmployee(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.deleteEmployee(id, actorId);
  }

  @Patch(':id/reset-password')
  @Roles(RoleType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alias for administrative password reset' })
  async resetPasswordPatchAlias(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('id') actorId: string,
  ) {
    const pwd = dto.newPassword || dto.password;
    if (!pwd) {
      throw new BadRequestException('newPassword or password is required');
    }
    return this.usersService.resetPassword(id, pwd, actorId);
  }
}
