import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitApprovalDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Lead UUID to submit for final approval' })
  @IsUUID()
  @IsNotEmpty()
  leadId!: string;

  @ApiPropertyOptional({ example: 'Customer confirmed complete 30-day formulation regimen on call' })
  @IsOptional()
  @IsString()
  notes?: string;
}
