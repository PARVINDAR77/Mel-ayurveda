import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadPriority } from '@prisma/client';

export class CreateManualLeadDto {
  @ApiProperty({ example: 'Rajesh Patel', description: 'Customer / Prospect full name' })
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  @MinLength(2)
  @MaxLength(150)
  customerName!: string;

  @ApiProperty({ example: '9876543210', description: '10-digit Indian mobile number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^[6-9]\d{9}$/, { message: 'Must be a valid 10-digit Indian mobile number starting with 6-9' })
  phoneNumber!: string;

  @ApiPropertyOptional({ example: '9821234567' })
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Alternate phone must be a valid 10-digit Indian mobile number' })
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'rajesh.patel@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Gujarat' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Ahmedabad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'B-402, Shivalik Heights, Satellite Road' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Joint Care Oil & Shallaki Tablets' })
  @IsOptional()
  @IsString()
  productInterest?: string;

  @ApiPropertyOptional({ example: 'Suffering from chronic knee joint inflammation since 2 years' })
  @IsOptional()
  @IsString()
  customerRequirements?: string;

  @ApiPropertyOptional({ example: 'Walk-in referral from Dr. Trivedi clinic' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'FACEBOOK_ADS', description: 'Lead channel source' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ example: '2026-11-23', description: 'Date of customer inquiry' })
  @IsOptional()
  @IsString()
  inquiryDate?: string;

  @ApiPropertyOptional({ enum: LeadPriority, default: LeadPriority.NORMAL })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority = LeadPriority.NORMAL;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Optional ID of salesperson to assign immediately' })
  @IsOptional()
  @IsUUID()
  assignToEmployeeId?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ example: 'Rajesh Patel' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '9821234567' })
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Alternate phone must be a valid 10-digit Indian mobile number' })
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'rajesh.patel@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Gujarat' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Ahmedabad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'B-402, Shivalik Heights, Satellite Road' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Joint Care Oil & Shallaki Tablets' })
  @IsOptional()
  @IsString()
  productInterest?: string;

  @ApiPropertyOptional({ example: 'Suffering from chronic knee joint inflammation' })
  @IsOptional()
  @IsString()
  customerRequirements?: string;

  @ApiPropertyOptional({ example: 'Consultation notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: LeadPriority })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;
}
