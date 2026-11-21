import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleStatusDto {
  @ApiProperty({ example: false, description: 'True to activate, false to deactivate' })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'Employee on extended medical leave' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({ example: 'NewSuperPass2026!', description: 'New password for the employee account' })
  @IsOptional()
  @IsString()
  newPassword?: string;

  @ApiPropertyOptional({ example: 'NewSuperPass2026!', description: 'Alias for newPassword' })
  @IsOptional()
  @IsString()
  password?: string;
}
