import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class BatchAssignCustomerFollowUpDto {
  @ApiProperty({
    description: 'Array of Customer UUIDs to assign for follow-up care',
    example: ['b874bace-8368-442f-97be-c88f16a25286'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Must select at least one customer to assign' })
  @IsUUID('4', { each: true, message: 'Each customerId must be a valid UUID' })
  customerIds!: string[];

  @ApiProperty({
    description: 'UUID of the Follow-Up Executive / Consultant receiving the clients',
  })
  @IsNotEmpty({ message: 'Must select an executive to assign' })
  @IsUUID('4')
  assignedToId!: string;

  @ApiProperty({
    description: 'Campaign objective or follow-up protocol name',
    example: 'Day 14 - Treatment Progress & Symptom Relief Audit',
  })
  @IsNotEmpty({ message: 'Campaign objective is required' })
  @IsString()
  campaignObjective!: string;

  @ApiPropertyOptional({
    description: 'Specific instructions, dosage inquiries or special directives from Super Admin',
    example: 'Check knee swelling reduction with Asthi taila. If customer wants to continue, offer 10% refill concession.',
  })
  @IsOptional()
  @IsString()
  adminDirectives?: string;

  @ApiPropertyOptional({
    description: 'Target due date / scheduled consultation time (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}
