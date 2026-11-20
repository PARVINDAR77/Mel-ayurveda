import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CustomerQueryDto {
  @ApiPropertyOptional({ description: 'Search by customer name, phone, code, or city' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Records per page', default: 20 })
  @IsOptional()
  limit?: number;
}
