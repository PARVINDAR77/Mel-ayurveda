import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RestockInventoryDto {
  @ApiProperty({ description: 'Product formulation UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Number of units received into warehouse', example: 50 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Manufacturing batch / lot number', example: 'BATCH-2026-NOV-09' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({
    description: 'Procurement invoice reference or notes',
    example: 'Factory replenishment from Bharuch manufacturing unit.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
