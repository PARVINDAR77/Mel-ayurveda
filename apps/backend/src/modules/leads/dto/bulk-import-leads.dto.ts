import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ImportLeadRowDto {
  @ApiPropertyOptional({ description: 'Lead channel or marketing source' })
  @IsOptional()
  @IsString()
  sourceOfLead?: string;

  @ApiPropertyOptional({ description: 'Patient / customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Primary contact phone' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: 'Alternate phone' })
  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Pincode' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Target disease or health complaint' })
  @IsOptional()
  @IsString()
  disease?: string;

  @ApiPropertyOptional({ description: 'Product of interest' })
  @IsOptional()
  @IsString()
  productInterest?: string;

  @ApiPropertyOptional({ description: 'Assigned salesperson code or name' })
  @IsOptional()
  @IsString()
  agent?: string;

  @ApiPropertyOptional({ description: 'Creation / intake date' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Lead reference number' })
  @IsOptional()
  @IsString()
  leadCode?: string;

  @ApiPropertyOptional({ description: 'Payment mode' })
  @IsOptional()
  @IsString()
  paymentMode?: string;

  @ApiPropertyOptional({ description: 'Stage or status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Estimated value / total' })
  @IsOptional()
  amount?: number;
}

export class BulkImportLeadsDto {
  @ApiProperty({ description: 'Array of leads to bulk import', type: [ImportLeadRowDto] })
  @IsArray()
  leads: ImportLeadRowDto[];
}
