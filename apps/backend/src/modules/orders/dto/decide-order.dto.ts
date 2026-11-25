import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class DecideOrderDto {
  @ApiProperty({
    enum: ['CONFIRM', 'REJECT', 'REQUEST_RECTIFICATION'],
    description: 'Decision action for this formulation order',
    example: 'CONFIRM',
  })
  @IsNotEmpty({ message: 'Decision action is required (CONFIRM, REJECT, or REQUEST_RECTIFICATION)' })
  @IsEnum(['CONFIRM', 'REJECT', 'REQUEST_RECTIFICATION'], {
    message: 'Decision must be one of CONFIRM, REJECT, or REQUEST_RECTIFICATION',
  })
  decision!: 'CONFIRM' | 'REJECT' | 'REQUEST_RECTIFICATION';

  @ApiProperty({
    description: 'Detailed officer remarks, clinical reason, or rectification directive for the booking salesperson',
    example: 'Formulation verified and medically approved. Stock reserved for courier handover.',
  })
  @IsNotEmpty({ message: 'Officer remarks are mandatory for audit and salesperson guidance' })
  @IsString()
  @MinLength(3, { message: 'Officer remarks must be at least 3 characters' })
  remarks!: string;

  @ApiPropertyOptional({
    description: 'Structured reason code for rejection or rectification',
    example: 'PINCODE_UNSERVICEABLE',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
