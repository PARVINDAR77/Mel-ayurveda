import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'User ID of the actor' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Action performed (e.g. LOGIN, LEAD_ASSIGN, ORDER_CONFIRM)' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ description: 'Entity affected (e.g. Lead, Order, Customer, User)' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: 'ID of the affected entity' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ description: 'Previous state JSON before modification' })
  @IsOptional()
  oldState?: any;

  @ApiPropertyOptional({ description: 'New state JSON after modification' })
  @IsOptional()
  newState?: any;

  @ApiPropertyOptional({ description: 'Client IP address' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Client User Agent' })
  @IsString()
  @IsOptional()
  userAgent?: string;
}
