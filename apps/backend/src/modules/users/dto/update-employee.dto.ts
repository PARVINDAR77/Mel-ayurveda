import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Ramesh' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Patel' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'ramesh.patel@melayurveda.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Must be a valid 10-digit Indian mobile number' })
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: RoleType })
  @IsOptional()
  @IsEnum(RoleType)
  role?: RoleType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAcceptingLeads?: boolean;
}
