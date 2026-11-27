import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CustomerFollowUpStatus } from '@prisma/client';

export class UpdateFollowUpStatusDto {
  @ApiProperty({
    enum: CustomerFollowUpStatus,
    description: 'New customer care follow-up status',
    example: CustomerFollowUpStatus.COMPLETED,
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(CustomerFollowUpStatus, { message: 'Must be a valid CustomerFollowUpStatus' })
  status!: CustomerFollowUpStatus;

  @ApiPropertyOptional({
    description: 'Optional consultation notes or rationale for status change',
    example: 'Called patient, confirmed treatment regimen followed correctly. Follow-up complete.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional call disposition',
    example: 'CONNECTED_SATISFIED',
  })
  @IsOptional()
  @IsString()
  disposition?: string;
}
