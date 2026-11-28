import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength, IsDateString } from 'class-validator';

export enum VerificationCancellationReason {
  PRICE_TOO_HIGH = 'PRICE_TOO_HIGH',
  FAMILY_OBJECTED = 'FAMILY_OBJECTED',
  NOT_READY_NOW = 'NOT_READY_NOW',
  HESITANT_ON_RESULTS = 'HESITANT_ON_RESULTS',
  DELIVERY_TIME_CONCERN = 'DELIVERY_TIME_CONCERN',
  FINANCIAL_CONSTRAINT = 'FINANCIAL_CONSTRAINT',
  DENIES_PLACING_ORDER = 'DENIES_PLACING_ORDER',
  PURCHASED_COMPETITOR = 'PURCHASED_COMPETITOR',
  OTHER = 'OTHER',
}

export class ClientCancelFollowupDto {
  @ApiProperty({
    description: 'Primary reason why customer cancelled deal during medical verification call',
    example: 'PRICE_TOO_HIGH',
  })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;

  @ApiProperty({
    description: 'Detailed customer feedback, objections and concerns voiced to the approval officer',
    example: 'Patient feels package price is too high; family wants local Ayurvedic doctor opinion instead.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  clientFeedback: string;

  @ApiProperty({
    description: 'Scheduled callback timestamp for salesperson to re-engage with customer',
    example: '2026-11-29T10:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledTime: string;

  @ApiPropertyOptional({
    description: 'Internal operational notes or tactical tips for the salesperson',
    example: 'Offer 10% senior citizen concession or offer 30-day starter kit instead of 60-day.',
  })
  @IsOptional()
  @IsString()
  officerInternalNotes?: string;
}
