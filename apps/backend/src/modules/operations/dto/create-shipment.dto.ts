import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty({
    description: 'Logistics / Courier partner name',
    example: 'Delhivery',
  })
  @IsString()
  @IsNotEmpty()
  courierPartner: string;

  @ApiProperty({
    description: 'Air Waybill (AWB) consignment tracking number',
    example: 'DLV9876543210',
  })
  @IsString()
  @IsNotEmpty()
  trackingAwb: string;

  @ApiPropertyOptional({
    description: 'Direct courier web tracking portal URL',
    example: 'https://www.delhivery.com/track/package/DLV9876543210',
  })
  @IsOptional()
  @IsString()
  trackingUrl?: string;
}
