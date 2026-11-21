import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMode } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty({ description: 'Ayurvedic product formulation UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Order quantity', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit price (₹)' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Dosage instructions or regimen' })
  @IsOptional()
  @IsString()
  dosageInstructions?: string;
}

export class CreateDraftOrderDto {
  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    type: [OrderItemDto],
    description: 'Array of Ayurvedic items and quantities',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Applied discount amount (₹)', default: 0, example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({
    enum: PaymentMode,
    description: 'Selected customer payment mode',
    default: PaymentMode.CASH_ON_DELIVERY,
  })
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @ApiPropertyOptional({
    description: 'Ayurvedic dosage recommendations or packaging instructions',
    example: 'Deliver before 5 PM. Take 10ml oil twice daily warm before bath.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
