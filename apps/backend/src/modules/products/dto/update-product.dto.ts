import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Updated formulation name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Therapeutic description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Specific target disease condition or indication' })
  @IsOptional()
  @IsString()
  targetDisease?: string;

  @ApiPropertyOptional({ description: 'Dosage regimen instructions' })
  @IsOptional()
  @IsString()
  dosageInstructions?: string;

  @ApiPropertyOptional({ description: 'Classical herbal ingredients & composition' })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({ description: 'Dosage formulation form' })
  @IsOptional()
  @IsString()
  dosageForm?: string;

  @ApiPropertyOptional({ description: 'Product image URL or Base64 data' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'MRP Price (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrpPrice?: number;

  @ApiPropertyOptional({ description: 'Selling Price (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ApiPropertyOptional({ description: 'GST rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @ApiPropertyOptional({ description: 'Active listing status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
