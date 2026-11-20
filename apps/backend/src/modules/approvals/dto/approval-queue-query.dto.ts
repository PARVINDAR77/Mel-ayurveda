import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ApprovalQueueFilter {
  ALL_ACTIVE = 'ALL_ACTIVE',
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
  DECIDED = 'DECIDED',
}

export class ApprovalQueueQueryDto {
  @ApiPropertyOptional({
    enum: ApprovalQueueFilter,
    description: 'Filter approval queue by claim/decision status',
    default: ApprovalQueueFilter.ALL_ACTIVE,
  })
  @IsOptional()
  @IsEnum(ApprovalQueueFilter)
  filter?: ApprovalQueueFilter;

  @ApiPropertyOptional({ description: 'Filter by search query matching customer name, phone, or lead code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page', default: 20 })
  @IsOptional()
  limit?: number;
}
