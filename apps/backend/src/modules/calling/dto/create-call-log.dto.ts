import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CallOutcome } from '@prisma/client';

export class CreateCallLogDto {
  @ApiProperty({ description: 'Target Lead UUID' })
  @IsUUID()
  @IsNotEmpty()
  leadId: string;

  @ApiProperty({
    enum: CallOutcome,
    description: 'Outcome of the telephonic consultation',
    example: CallOutcome.INTERESTED,
  })
  @IsEnum(CallOutcome)
  @IsNotEmpty()
  callOutcome: CallOutcome;

  @ApiPropertyOptional({
    description: 'Call duration in seconds',
    default: 0,
    example: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({
    description: 'Detailed patient consultation notes and symptom discussion',
    example: 'Patient interested in Psoriasis Ayurvedic Oil regimen. Follow up in 3 days.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Optional callback date/time (ISO 8601). Required if outcome is BUSY_CALL_LATER or FOLLOW_UP_REQUIRED.',
    example: '2026-11-25T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  scheduledFollowUpTime?: string;

  @ApiPropertyOptional({
    description: 'Specific notes for the scheduled callback',
    example: 'Call back at 10 AM after morning clinic consultation.',
  })
  @IsOptional()
  @IsString()
  followUpNotes?: string;
}
