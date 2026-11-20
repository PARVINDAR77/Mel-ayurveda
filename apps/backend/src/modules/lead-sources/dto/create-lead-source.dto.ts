import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSourceType } from '@prisma/client';

export class CreateLeadSourceDto {
  @ApiProperty({ example: 'Meta Facebook Ads Q4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: LeadSourceType, example: LeadSourceType.FACEBOOK_ADS })
  @IsEnum(LeadSourceType)
  @IsNotEmpty()
  sourceType!: LeadSourceType;

  @ApiPropertyOptional({ example: 'Direct Meta Lead Form campaigns for joint care' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateLeadSourceDto {
  @ApiPropertyOptional({ example: 'Meta Facebook Ads 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
