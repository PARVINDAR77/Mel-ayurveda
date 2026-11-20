import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFollowUpDto {
  @ApiProperty({ description: 'Target Lead UUID', example: 'd3b07384-d113-466f-8703-a1789c670a4a' })
  @IsUUID()
  @IsNotEmpty()
  leadId: string;

  @ApiProperty({
    description: 'Scheduled callback timestamp in ISO 8601 format',
    example: '2026-11-25T14:30:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledTime: string;

  @ApiPropertyOptional({
    description: 'Actionable reminder notes for the callback',
    example: 'Discuss 3-month skin wellness course pricing with customer spouse.',
  })
  @IsOptional()
  @IsString()
  reminderNotes?: string;

  @ApiPropertyOptional({
    description: 'Specific employee assigned to callback (Admin override only)',
  })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
