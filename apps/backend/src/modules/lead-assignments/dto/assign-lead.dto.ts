import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignLeadDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Lead ID to assign' })
  @IsUUID()
  @IsNotEmpty()
  leadId!: string;

  @ApiProperty({ example: 'aa4493ae-0d92-4507-8030-5f72fc2fbd2b', description: 'Salesperson user ID' })
  @IsUUID()
  @IsNotEmpty()
  assignedToId!: string;

  @ApiPropertyOptional({ example: 'Assigned based on Ahmedabad regional queue' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkAssignDto {
  @ApiProperty({ example: ['lead-uuid-1', 'lead-uuid-2'], description: 'Array of Lead IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  leadIds!: string[];

  @ApiProperty({ example: 'salesperson-uuid', description: 'Salesperson user ID' })
  @IsUUID()
  @IsNotEmpty()
  assignedToId!: string;

  @ApiPropertyOptional({ example: 'Bulk allocation of weekend inbound leads' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReassignLeadDto {
  @ApiProperty({ example: 'lead-uuid-1' })
  @IsUUID()
  @IsNotEmpty()
  leadId!: string;

  @ApiProperty({ example: 'salesperson-uuid-2' })
  @IsUUID()
  @IsNotEmpty()
  newAssignedToId!: string;

  @ApiProperty({ example: 'Original salesperson on leave; transferring active inquiry', description: 'Mandatory reason for audit' })
  @IsString()
  @IsNotEmpty({ message: 'Reassignment reason is mandatory for compliance audit' })
  reason!: string;
}
