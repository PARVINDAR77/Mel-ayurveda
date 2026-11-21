import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('In-App Notifications Bus (Bundle 15)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Real-time Server-Sent Events stream of user notifications' })
  streamNotifications(@CurrentUser() user: any): Observable<MessageEvent> {
    return this.notificationsService.getEventStream(user.id);
  }

  @Get('unread-summary')
  @ApiOperation({ summary: 'Get unread counts grouped by route/section path for badges' })
  @ApiResponse({ status: 200, description: 'Unread summary by path' })
  async getUnreadSummary(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadSummary(user.id);
  }

  @Patch('mark-path-read')
  @ApiOperation({ summary: 'Mark all unread notifications matching a route path as read' })
  @ApiResponse({ status: 200, description: 'Notifications for path marked as read' })
  async markPathAsRead(@CurrentUser() user: any, @Body('path') path: string) {
    return this.notificationsService.markPathAsRead(user.id, path);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user notifications with unread count and pagination' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Dispatch a new notification to a user' })
  @ApiResponse({ status: 201, description: 'Notification dispatched' })
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read (Anti-IDOR protected)' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden if modifying another user notification' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications of current user as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification (Anti-IDOR protected)' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.deleteNotification(id, user.id);
  }
}
