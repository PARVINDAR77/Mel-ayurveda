import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMode, PaymentStatus } from '@prisma/client';
import { OrderItemDto } from './create-draft-order.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Order lifecycle status (DRAFT, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    type: [OrderItemDto],
    description: 'Updated items, quantities and selling prices',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Negotiated discount (₹)', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({
    enum: PaymentMode,
    description: 'Payment method',
  })
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Payment collection status',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment reference or transaction ID' })
  @IsOptional()
  @IsString()
  paymentRef?: string;

  @ApiPropertyOptional({ description: 'Customer full name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Primary phone' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Alternative phone' })
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional({ description: 'Shipping delivery address' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Pincode' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ description: 'General order notes or Ayurvedic regimen' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Mandatory clinical or commercial amendment remarks by Approval Officer or Management',
    example: 'Changed formulation to mild course; client requested 60-day pack with ₹200 concession.',
  })
  @IsOptional()
  @IsString()
  approverRemarks?: string;
}
