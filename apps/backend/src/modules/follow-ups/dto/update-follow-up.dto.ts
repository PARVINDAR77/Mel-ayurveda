import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RescheduleFollowUpDto {
  @ApiProperty({
    description: 'New rescheduled callback timestamp in ISO 8601 format',
    example: '2026-11-26T16:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledTime: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling or updated conversation notes',
    example: 'Customer requested afternoon callback instead of morning.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
