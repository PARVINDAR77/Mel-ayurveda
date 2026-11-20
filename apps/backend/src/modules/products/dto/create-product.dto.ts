import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'Unique Product SKU code', example: 'MEL-AYUR-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Name of the Ayurvedic formulation',
    example: 'Artho-Care Joint Healing Oil',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Therapeutic disease category UUID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Classical ingredients and dosage indications',
    example: 'Formulated with Mahanarayan Taila and Shallaki for deep joint inflammation relief.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Maximum Retail Price (₹)', example: 1299 })
  @IsNumber()
  @Min(0)
  mrpPrice: number;

  @ApiProperty({ description: 'Discounted selling price (₹)', example: 999 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ description: 'Applicable GST rate percentage', default: 12.0, example: 12.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @ApiPropertyOptional({ description: 'Initial warehouse stock to replenish', default: 100, example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialStock?: number;
}
