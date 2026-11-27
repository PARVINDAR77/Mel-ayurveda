import { Injectable, NotFoundException, ForbiddenException, MessageEvent } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationType, RoleType, OrderStatus } from '@prisma/client';
import { Subject, Observable, merge, interval } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable()
export class NotificationsService {
  private notificationEvents$ = new Subject<{ userId: string; notification: any }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Real-time Server-Sent Events stream for connected user
   */
  getEventStream(userId: string): Observable<MessageEvent> {
    const userStream$ = this.notificationEvents$.asObservable().pipe(
      filter((e) => e.userId === userId),
      map(
        (e) =>
          ({
            data: {
              type: 'NOTIFICATION',
              payload: e.notification,
            },
          }) as MessageEvent,
      ),
    );

    // Heartbeat every 20 seconds to keep connection alive
    const heartbeat$ = interval(20000).pipe(
      map(
        () =>
          ({
            data: {
              type: 'HEARTBEAT',
              timestamp: Date.now(),
            },
          }) as MessageEvent,
      ),
    );

    return merge(userStream$, heartbeat$);
  }

  /**
   * Dispatch a notification to a specific user
   */
  async createNotification(dto: CreateNotificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        link: dto.link,
      },
    });

    // Push live event
    this.notificationEvents$.next({ userId: notification.userId, notification });

    return notification;
  }

  /**
   * Batch dispatch notification to multiple users
   */
  async dispatchToUsers(
    userIds: string[],
    data: { title: string; message: string; type: NotificationType; link?: string },
  ) {
    if (!userIds || userIds.length === 0) return [];
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

    const createdNotifications = await this.prisma.$transaction(
      uniqueUserIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            title: data.title,
            message: data.message,
            type: data.type,
            link: data.link,
          },
        }),
      ),
    );

    for (const notif of createdNotifications) {
      this.notificationEvents$.next({ userId: notif.userId, notification: notif });
    }

    return createdNotifications;
  }

  /**
   * Broadcast notification to all active users with specific role(s)
   */
  async dispatchToRole(
    roles: RoleType[],
    data: { title: string; message: string; type: NotificationType; link?: string },
  ) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });

    return this.dispatchToUsers(
      users.map((u) => u.id),
      data,
    );
  }

  /**
   * Get user's notifications with pagination & unread count
   */
  async getUserNotifications(userId: string, query: NotificationQueryDto) {
    const { unreadOnly, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification counts grouped by target path for sidebar red dots
   */
  async getUnreadSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const unreadNotifications = await this.prisma.notification.findMany({
      where: { userId, isRead: false },
      select: { id: true, link: true, type: true },
    });

    const byPath: Record<string, number> = {};
    for (const notif of unreadNotifications) {
      if (notif.link) {
        byPath[notif.link] = (byPath[notif.link] || 0) + 1;
      }
    }

    // Dynamic queue counters for operations management & super admin
    if (user && (user.role === RoleType.SUPER_ADMIN || user.role === RoleType.MANAGEMENT)) {
      const readyDispatchOrdersCount = await this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.PROCESSING, OrderStatus.CONFIRMED] },
          invoice: { isNot: null },
          shipment: null,
        },
      });

      if (readyDispatchOrdersCount > 0) {
        byPath['/management/dispatch'] = Math.max(
          byPath['/management/dispatch'] || 0,
          readyDispatchOrdersCount,
        );
      }
    }

    const totalUnread = Object.values(byPath).reduce((a, b) => a + b, 0);

    return {
      totalUnread: Math.max(unreadNotifications.length, totalUnread),
      byPath,
    };
  }

  /**
   * Mark all unread notifications matching a route path as read (clears section red dot)
   */
  async markPathAsRead(userId: string, path: string) {
    if (!path) return { updatedCount: 0 };

    const updateResult = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        link: { startsWith: path },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      path,
      updatedCount: updateResult.count,
    };
  }

  /**
   * Mark single notification as read with Anti-IDOR verification
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Anti-IDOR: You cannot access or modify notifications of another user');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all unread notifications of user as read
   */
  async markAllAsRead(userId: string) {
    const updateResult = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'All unread notifications marked as read',
      updatedCount: updateResult.count,
    };
  }

  /**
   * Delete notification with Anti-IDOR check
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Anti-IDOR: You cannot delete notifications of another user');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      message: 'Notification deleted successfully',
      id: notificationId,
    };
  }
}
