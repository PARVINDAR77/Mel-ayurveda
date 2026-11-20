import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum FollowUpFilterStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
  ALL = 'ALL',
}

export enum FollowUpDateRange {
  TODAY = 'today',
  UPCOMING = 'upcoming',
  OVERDUE = 'overdue',
  ALL = 'all',
}

export class FollowUpQueryDto {
  @ApiPropertyOptional({
    enum: FollowUpFilterStatus,
    description: 'Filter by follow-up lifecycle status',
    default: FollowUpFilterStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(FollowUpFilterStatus)
  status?: FollowUpFilterStatus;

  @ApiPropertyOptional({
    enum: FollowUpDateRange,
    description: 'Date range filter: today, upcoming, overdue, all',
    default: FollowUpDateRange.ALL,
  })
  @IsOptional()
  @IsEnum(FollowUpDateRange)
  range?: FollowUpDateRange;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page', default: 20 })
  @IsOptional()
  limit?: number;
}
