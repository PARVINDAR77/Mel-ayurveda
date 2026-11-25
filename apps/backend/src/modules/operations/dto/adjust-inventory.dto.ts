import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum InventoryAdjustmentType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  SET_COUNT = 'SET_COUNT',
}

export class AdjustInventoryDto {
  @ApiProperty({ description: 'Product formulation UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    enum: InventoryAdjustmentType,
    description: 'Operation type: ADD (Restock), REMOVE (Damage/Scrap), SET_COUNT (Calibrate)',
    example: InventoryAdjustmentType.ADD,
  })
  @IsEnum(InventoryAdjustmentType)
  action: InventoryAdjustmentType;

  @ApiProperty({ description: 'Number of units to add, remove, or set', example: 10 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Reason category e.g. DAMAGED, EXPIRED, RESTOCK, AUDIT' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Batch number or supplier reference' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'New low stock warning threshold' })
  @IsOptional()
  @IsInt()
  @Min(1)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ description: 'Detailed notes explaining the adjustment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
