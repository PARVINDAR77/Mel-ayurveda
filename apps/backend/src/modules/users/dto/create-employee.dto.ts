import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Ramesh', description: 'Employee first name' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Patel', description: 'Employee last name' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'ramesh.patel@melayurveda.com', description: 'Official employee email' })
  @IsEmail({}, { message: 'Must provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: '9876543210', description: '10-digit Indian contact number' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const clean = value.replace(/[\s\-\+]/g, '');
    if (clean.startsWith('91') && clean.length === 12) return clean.slice(2);
    if (clean.startsWith('0') && clean.length === 11) return clean.slice(1);
    return clean;
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^[6-9]\d{9}$/, { message: 'Must be a valid 10-digit Indian mobile number starting with 6-9' })
  phoneNumber!: string;

  @ApiProperty({ enum: RoleType, example: RoleType.SALESPERSON })
  @IsEnum(RoleType, { message: 'Role must be a valid system RoleType' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: RoleType;

  @ApiPropertyOptional({ example: 'RameshSecure@2026', description: 'Optional initial password' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Initial password must be at least 8 characters' })
  initialPassword?: string;

  @ApiPropertyOptional({ example: 'RameshSecure@2026', description: 'Alias for initialPassword' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAcceptingLeads?: boolean = true;
}
