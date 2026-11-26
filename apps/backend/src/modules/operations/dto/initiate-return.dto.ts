import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReturnReason } from '@prisma/client';

export class InitiateReturnDto {
  @ApiProperty({ description: 'Order ID to initiate return for', example: 'uuid' })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Initial return reason', enum: ReturnReason, required: false })
  @IsOptional()
  @IsEnum(ReturnReason)
  returnReason?: ReturnReason;

  @ApiProperty({ description: 'Initial remarks or notes from courier/customer', required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}
