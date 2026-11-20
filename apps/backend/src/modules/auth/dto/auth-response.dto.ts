import { ApiProperty } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

export class UserSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'MEL-ADM-001' })
  employeeCode!: string;

  @ApiProperty({ example: 'admin@melayurveda.com' })
  email!: string;

  @ApiProperty({ example: 'Super' })
  firstName!: string;

  @ApiProperty({ example: 'Admin' })
  lastName!: string;

  @ApiProperty({ example: '9876543210' })
  phoneNumber!: string;

  @ApiProperty({ enum: RoleType, example: RoleType.SUPER_ADMIN })
  role!: RoleType;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: true })
  isAcceptingLeads!: boolean;

  @ApiProperty({ example: '2026-11-20T12:00:00.000Z', nullable: true })
  lastLoginAt?: Date | null;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;
}
