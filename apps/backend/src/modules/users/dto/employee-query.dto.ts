import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

export class EmployeeQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: RoleType, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Ramesh', description: 'Search by name, email, employee code, or phone' })
  @IsOptional()
  @IsString()
  search?: string;
}
