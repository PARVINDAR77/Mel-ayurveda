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
  @ApiProperty({ example: 'NewSuperPass2026!', description: 'New password for the employee account' })
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
