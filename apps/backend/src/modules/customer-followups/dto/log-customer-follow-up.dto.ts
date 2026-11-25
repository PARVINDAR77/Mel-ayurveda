import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { HealthReliefRating } from '@prisma/client';

export class LogCustomerFollowUpDto {
  @ApiProperty({
    description: 'Call disposition outcome',
    example: 'CONNECTED_SATISFIED',
  })
  @IsNotEmpty({ message: 'Disposition is required' })
  @IsString()
  disposition!: string;

  @ApiPropertyOptional({
    enum: HealthReliefRating,
    description: 'Patient symptom relief scale assessed during consultation',
    example: HealthReliefRating.SIGNIFICANT_RELIEF,
  })
  @IsOptional()
  @IsEnum(HealthReliefRating, { message: 'Must be a valid HealthReliefRating' })
  healthRating?: HealthReliefRating;

  @ApiProperty({
    description: 'Consultation notes and qualitative feedback from client',
    example: 'Client reported 60% reduction in joint pain. Continues Kwath morning & evening.',
  })
  @IsNotEmpty({ message: 'Consultation notes are required' })
  @IsString()
  consultationNotes!: string;

  @ApiPropertyOptional({
    description: 'Direct patient quotation or specific feedback',
  })
  @IsOptional()
  @IsString()
  patientFeedback?: string;

  @ApiPropertyOptional({
    description: 'Whether client expressed interest in ordering next month refill course',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  refillRequested?: boolean;

  @ApiPropertyOptional({
    description: 'Scheduled timestamp for next follow-up check-in (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @ApiPropertyOptional({
    description: 'Duration of phone consultation in seconds',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  callDurationSeconds?: number;
}
