import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';

export class UpdateShipmentStatusDto {
  @ApiProperty({
    enum: ShipmentStatus,
    description: 'Updated courier transit status',
    example: ShipmentStatus.DELIVERED,
  })
  @IsEnum(ShipmentStatus)
  @IsNotEmpty()
  status: ShipmentStatus;
}
