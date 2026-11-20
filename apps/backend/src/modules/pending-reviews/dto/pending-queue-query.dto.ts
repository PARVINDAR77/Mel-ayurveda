import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PendingQueueFilter {
  ALL_ACTIVE = 'ALL_ACTIVE',
  UNCLAIMED = 'UNCLAIMED',
  CLAIMED = 'CLAIMED',
  DECIDED = 'DECIDED',
}

export class PendingQueueQueryDto {
  @ApiPropertyOptional({
    enum: PendingQueueFilter,
    description: 'Filter review queue by claim status',
    default: PendingQueueFilter.ALL_ACTIVE,
  })
  @IsOptional()
  @IsEnum(PendingQueueFilter)
  filter?: PendingQueueFilter;

  @ApiPropertyOptional({ description: 'Filter by search term in customer name, phone, or lead code' })
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
