import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsNumber } from 'class-validator';

export class ImportProductItemDto {
  @ApiPropertyOptional({ description: 'Product formulation name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Item quantity', default: 1 })
  @IsOptional()
  quantity?: number;
}

export class ImportOrderRowDto {
  @ApiPropertyOptional({ description: 'Lead channel or marketing source' })
  @IsOptional()
  @IsString()
  sourceOfLead?: string;

  @ApiPropertyOptional({ description: 'Payment method (COD, PREPAID, UPI, etc.)' })
  @IsOptional()
  @IsString()
  paymentMode?: string;

  @ApiPropertyOptional({ description: 'Order delivery or dispatch status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Legacy Order ID / reference' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Historical order date (DD-MM-YYYY or ISO)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Sales consultant name or employee code' })
  @IsOptional()
  @IsString()
  agent?: string;

  @ApiPropertyOptional({ description: 'Customer or patient full name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Primary mobile number' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: 'Alternate mobile number' })
  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @ApiPropertyOptional({ description: 'Delivery street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Postal pincode' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State name' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Target disease or indication' })
  @IsOptional()
  @IsString()
  disease?: string;

  @ApiPropertyOptional({ description: 'Total order amount in ₹' })
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'List of product formulations and quantities', type: [ImportProductItemDto] })
  @IsOptional()
  @IsArray()
  products?: ImportProductItemDto[];
}

export class BulkImportOrdersDto {
  @ApiProperty({ description: 'Array of orders to bulk import', type: [ImportOrderRowDto] })
  @IsArray()
  orders: ImportOrderRowDto[];
}
