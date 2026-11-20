import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApprovalDecision } from '@prisma/client';

export enum SendBackTarget {
  PENDING_PANEL = 'PENDING_PANEL',
  SALESPERSON = 'SALESPERSON',
}

export class DecideApprovalDto {
  @ApiProperty({
    enum: ApprovalDecision,
    description: 'Final commercial and medical sign-off decision',
    example: ApprovalDecision.APPROVE,
  })
  @IsEnum(ApprovalDecision)
  @IsNotEmpty()
  decision: ApprovalDecision;

  @ApiPropertyOptional({
    description: 'Structured rationale or category code (e.g. MEDICAL_CONTRAINDICATION, COMMERCIAL_UNVIABILITY, PATIENT_UNWILLING, DUPLICATE_ORDER)',
    example: 'COMMERCIAL_UNVIABILITY',
  })
  @IsOptional()
  @IsString()
  decisionReason?: string;

  @ApiProperty({
    description: 'Detailed medical advisor notes, commercial verification certificate, or rectification guidance',
    example: 'Verified Ayurvedic therapeutic parameters, dosage limits, and 45-day pricing breakdown. Patient cleared for formal order placement.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  officerNotes: string;

  @ApiPropertyOptional({
    enum: SendBackTarget,
    description: 'Target panel when decision is SEND_BACK (defaults to PENDING_PANEL)',
    default: SendBackTarget.PENDING_PANEL,
  })
  @IsOptional()
  @IsEnum(SendBackTarget)
  sendBackTarget?: SendBackTarget;
}
