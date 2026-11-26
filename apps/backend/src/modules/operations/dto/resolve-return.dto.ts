import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReturnStatus } from '@prisma/client';

export class ResolveReturnDto {
  @ApiProperty({
    description: 'Final resolution status',
    enum: [
      ReturnStatus.RESTOCKED_AND_CLOSED,
      ReturnStatus.RE_ATTEMPT_SCHEDULED,
      ReturnStatus.RETURN_APPROVED,
      ReturnStatus.REJECTED,
    ],
    example: ReturnStatus.RESTOCKED_AND_CLOSED,
  })
  @IsNotEmpty()
  @IsEnum(ReturnStatus)
  resolutionStatus: ReturnStatus;

  @ApiProperty({
    description: 'Return / courier shipping charge collected from customer (₹)',
    required: false,
    default: 0.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  returnFeeCharged?: number;

  @ApiProperty({ description: 'Payment method for return fee (UPI, CASH, WAIVED)', required: false })
  @IsOptional()
  @IsString()
  feePaymentMode?: string;

  @ApiProperty({ description: 'UPI reference ID or payment transaction ref', required: false })
  @IsOptional()
  @IsString()
  feePaymentRef?: string;

  @ApiProperty({ description: 'Final settlement notes / instructions', required: false })
  @IsOptional()
  @IsString()
  settlementNotes?: string;
}
