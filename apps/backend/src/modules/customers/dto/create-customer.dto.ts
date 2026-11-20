import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Full name of the customer', example: 'Harish Bhai Patel' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ description: 'Primary 10-digit Indian mobile number', example: '9825012345' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Must be a valid 10-digit Indian mobile number' })
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Alternate phone number' })
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Alternate phone must be a valid 10-digit Indian mobile number' })
  alternatePhone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'PIN Code' })
  @IsOptional()
  @Matches(/^[1-9]\d{5}$/, { message: 'PIN code must be a valid 6-digit Indian postal code' })
  pincode?: string;
}
