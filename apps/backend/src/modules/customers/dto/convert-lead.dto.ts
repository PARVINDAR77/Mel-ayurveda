import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ConvertLeadDto {
  @ApiPropertyOptional({
    description: 'Confirmed delivery address line',
    example: 'Flat 402, Nilkanth Residency, Satellite Road',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'City name', example: 'Ahmedabad' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State name', example: 'Gujarat' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Postal PIN code (6 digits)', example: '380015' })
  @IsOptional()
  @Matches(/^[1-9]\d{5}$/, { message: 'PIN code must be a valid 6-digit Indian postal code' })
  pincode?: string;

  @ApiPropertyOptional({ description: 'Alternate contact phone number' })
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Alternate phone must be a valid 10-digit Indian mobile number' })
  alternatePhone?: string;

  @ApiPropertyOptional({ description: 'Patient email address', example: 'patient@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
