import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService (Bundle 15 Unit Tests)', () => {
  let service: NotificationsService;
  let prisma: any;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create and return a notification for a valid user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'u-1',
        title: 'New Lead Assigned',
        message: 'Lead MEL-LEAD-001 assigned to you',
        type: NotificationType.LEAD_ASSIGNED,
        isRead: false,
      });

      const result = await service.createNotification({
        userId: 'u-1',
        title: 'New Lead Assigned',
        message: 'Lead MEL-LEAD-001 assigned to you',
        type: NotificationType.LEAD_ASSIGNED,
      });

      expect(result.id).toBe('notif-1');
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createNotification({
          userId: 'unknown-id',
          title: 'Hello',
          message: 'World',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications and unread count', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'notif-1', title: 'Test 1', isRead: false },
      ]);
      prisma.notification.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(2); // unreadCount

      const result = await service.getUserNotifications('u-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(5);
      expect(result.meta.unreadCount).toBe(2);
    });
  });

  describe('markAsRead (Anti-IDOR Guard)', () => {
    it('should mark notification as read when owned by caller', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'u-1',
        isRead: false,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        userId: 'u-1',
        isRead: true,
      });

      const result = await service.markAsRead('notif-1', 'u-1');
      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if notification belongs to another user (Anti-IDOR)', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'different-user',
        isRead: false,
      });

      await expect(service.markAsRead('notif-1', 'u-attacker')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications of user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 4 });

      const result = await service.markAllAsRead('u-1');
      expect(result.updatedCount).toBe(4);
    });
  });

  describe('deleteNotification (Anti-IDOR Guard)', () => {
    it('should throw ForbiddenException if deleting notification of another user', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-2',
        userId: 'victim-user',
      });

      await expect(service.deleteNotification('notif-2', 'attacker-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
