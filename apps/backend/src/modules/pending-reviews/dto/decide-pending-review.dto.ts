import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PendingDecision } from '@prisma/client';

export class DecidePendingReviewDto {
  @ApiProperty({
    enum: PendingDecision,
    description: 'Reviewer decision code',
    example: PendingDecision.APPROVE,
  })
  @IsEnum(PendingDecision)
  @IsNotEmpty()
  decision: PendingDecision;

  @ApiProperty({
    description: 'Detailed clinical rationale, dosage adjustment, discount approval, or rejection reasons',
    example: 'Verified liver safety profile. Approved standard dosage with Triphala co-prescription. Forwarding to commercial approval.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reviewerNotes: string;
}
