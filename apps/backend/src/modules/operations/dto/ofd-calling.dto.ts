import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { OFDCallStatus, ReturnReason } from '@prisma/client';

export class LogOFDCallDto {
  @ApiProperty({
    enum: OFDCallStatus,
    description: 'Outcome of the customer doorstep calling interaction',
    example: OFDCallStatus.DELIVERED_CONFIRMED,
  })
  @IsEnum(OFDCallStatus)
  @IsNotEmpty()
  callOutcome: OFDCallStatus;

  @ApiPropertyOptional({ description: 'Customer remarks or reason stated on call' })
  @IsOptional()
  @IsString()
  customerRemarks?: string;

  @ApiPropertyOptional({ description: 'Internal staff notes from the doorstep call' })
  @IsOptional()
  @IsString()
  callNotes?: string;

  @ApiPropertyOptional({ description: 'COD amount verified and collected in ₹', example: 2350 })
  @IsOptional()
  @IsNumber()
  codAmountCollected?: number;

  @ApiPropertyOptional({ description: 'Rescheduled delivery date (ISO string)', example: '2026-11-28T10:00:00Z' })
  @IsOptional()
  @IsString()
  rescheduleDate?: string;

  @ApiPropertyOptional({ description: 'Reason category if parcel was not accepted', enum: ReturnReason })
  @IsOptional()
  @IsEnum(ReturnReason)
  reasonCategory?: ReturnReason;
}

export class EscalateToRtoDto {
  @ApiProperty({
    enum: ReturnReason,
    description: 'Reason customer refused delivery at doorstep',
    example: ReturnReason.CUSTOMER_REFUSED,
  })
  @IsEnum(ReturnReason)
  @IsNotEmpty()
  reason: ReturnReason;

  @ApiProperty({ description: 'Detailed customer remarks from doorstep refusal' })
  @IsNotEmpty()
  @IsString()
  customerRemarks: string;

  @ApiPropertyOptional({ description: 'Internal staff calling notes' })
  @IsOptional()
  @IsString()
  callNotes?: string;
}
