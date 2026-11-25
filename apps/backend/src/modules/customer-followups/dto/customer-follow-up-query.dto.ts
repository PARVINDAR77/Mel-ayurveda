import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerFollowUpStatus } from '@prisma/client';

export class CustomerFollowUpQueryDto {
  @ApiPropertyOptional({
    enum: CustomerFollowUpStatus,
    description: 'Filter by follow-up status (PENDING, COMPLETED, etc.)',
  })
  @IsOptional()
  @IsEnum(CustomerFollowUpStatus)
  status?: CustomerFollowUpStatus;

  @ApiPropertyOptional({
    description: 'Search by customer name, phone number, or customer code',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned executive user UUID',
  })
  @IsOptional()
  @IsUUID('4')
  assignedToId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
