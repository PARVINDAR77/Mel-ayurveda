import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RouteCustomerToSalesDto {
  @ApiPropertyOptional({ description: 'Optional active order ID to cancel' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Whether to cancel active order' })
  @IsOptional()
  @IsBoolean()
  cancelActiveOrder?: boolean;

  @ApiProperty({ description: 'Salesperson user ID to receive the lead' })
  @IsNotEmpty()
  @IsUUID()
  assignedSalespersonId: string;

  @ApiProperty({ description: 'Particular directive message from management' })
  @IsNotEmpty()
  @IsString()
  directiveMessage: string;

  @ApiPropertyOptional({ description: 'Cancellation reason for order' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
