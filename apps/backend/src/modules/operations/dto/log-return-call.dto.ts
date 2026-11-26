import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReturnReason } from '@prisma/client';

export class LogReturnCallDto {
  @ApiProperty({
    description: 'Phone call outcome (e.g. CONNECTED, NO_ANSWER, BUSY, SWITCHED_OFF)',
    example: 'CONNECTED',
  })
  @IsNotEmpty()
  @IsString()
  callOutcome: string;

  @ApiProperty({ description: 'Verified return / cancellation reason', enum: ReturnReason })
  @IsNotEmpty()
  @IsEnum(ReturnReason)
  returnReason: ReturnReason;

  @ApiProperty({ description: 'Customer verbatim remarks & reason explanation', required: false })
  @IsOptional()
  @IsString()
  customerRemarks?: string;

  @ApiProperty({ description: 'Executive internal observation & notes', required: false })
  @IsOptional()
  @IsString()
  callNotes?: string;
}
