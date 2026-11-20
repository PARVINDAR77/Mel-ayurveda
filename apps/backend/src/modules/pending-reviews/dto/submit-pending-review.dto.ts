import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmitPendingReviewDto {
  @ApiProperty({
    description: 'Target Customer Lead UUID to be submitted for review',
    example: 'd3b07384-d113-466f-8703-a1789c670a4a',
  })
  @IsUUID()
  @IsNotEmpty()
  leadId: string;

  @ApiProperty({
    description: 'Reason code or primary trigger for review',
    example: 'Formulation contraindication or medicine dosage verification',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  reason: string;

  @ApiPropertyOptional({
    description: 'Detailed consultation notes, proposed medicine regimen, or customer special requests',
    example: 'Customer reports liver sensitivity along with joint ache. Requested 25% discount on 3-month course.',
  })
  @IsOptional()
  @IsString()
  salesNotes?: string;
}
