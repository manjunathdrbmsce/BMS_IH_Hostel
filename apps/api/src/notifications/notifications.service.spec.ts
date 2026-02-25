import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrisma = {
  notification: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  guardianLink: { findMany: jest.fn() },
  bedAssignment: { findFirst: jest.fn() },
  userRole: { findMany: jest.fn() },
};

const mockNotification = {
  id: 'notif-1',
  recipientId: 'u-parent',
  channel: 'IN_APP',
  title: 'Student Exit',
  message: 'Arjun Kumar left Kuvempu Hostel at 10:30 AM',
  violationId: null,
  gateEntryId: 'ge-1',
  state: 'SENT',
  readAt: null,
  sentAt: new Date(),
  failReason: null,
  createdAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  // -----------------------------------------------------------------------
  // createNotification
  // -----------------------------------------------------------------------
  describe('createNotification', () => {
    it('should create IN_APP notification and mark as SENT', async () => {
      mockPrisma.notification.create.mockResolvedValue({ ...mockNotification, state: 'PENDING' });
      mockPrisma.notification.update.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        recipientId: 'u-parent',
        title: 'Student Exit',
        message: 'Arjun left hostel',
      });
      expect(result.recipientId).toBe('u-parent');
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ state: 'SENT' }),
        }),
      );
    });

    it('should create EMAIL notification and mark as SENT (stub)', async () => {
      mockPrisma.notification.create.mockResolvedValue({ ...mockNotification, channel: 'EMAIL', state: 'PENDING' });
      mockPrisma.notification.update.mockResolvedValue({ ...mockNotification, channel: 'EMAIL' });

      await service.createNotification({
        recipientId: 'u-parent',
        channel: 'EMAIL' as any,
        title: 'Alert',
        message: 'Email body',
      });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ state: 'SENT' }),
        }),
      );
    });

    it('should optionally link violation and gate entry', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue(mockNotification);

      await service.createNotification({
        recipientId: 'u-parent',
        title: 'Late Alert',
        message: 'Student late',
        violationId: 'viol-1',
        gateEntryId: 'ge-1',
      });
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            violationId: 'viol-1',
            gateEntryId: 'ge-1',
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // notifyParents
  // -----------------------------------------------------------------------
  describe('notifyParents', () => {
    it('should send notifications to all guardians', async () => {
      mockPrisma.guardianLink.findMany.mockResolvedValue([
        { guardianId: 'u-parent-1' },
        { guardianId: 'u-parent-2' },
      ]);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue(mockNotification);

      const result = await service.notifyParents('u-student', 'Exit', 'Left hostel');
      expect(result).toHaveLength(2);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it('should return empty array if no guardians', async () => {
      mockPrisma.guardianLink.findMany.mockResolvedValue([]);
      const result = await service.notifyParents('u-student', 'Exit', 'Left hostel');
      expect(result).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // notifyWardens
  // -----------------------------------------------------------------------
  describe('notifyWardens', () => {
    it('should send notifications to hostel-scoped wardens', async () => {
      mockPrisma.bedAssignment.findFirst.mockResolvedValue({
        bed: { room: { hostelId: 'hostel-1' } },
      });
      mockPrisma.userRole.findMany
        .mockResolvedValueOnce([
          { userId: 'u-warden-1' },
          { userId: 'u-warden-2' },
        ]);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue(mockNotification);

      const result = await service.notifyWardens('u-student', 'Late', 'Student late');
      expect(result).toHaveLength(2);
    });

    it('should fallback to global wardens when no scoped wardens', async () => {
      mockPrisma.bedAssignment.findFirst.mockResolvedValue({
        bed: { room: { hostelId: 'hostel-1' } },
      });
      mockPrisma.userRole.findMany
        .mockResolvedValueOnce([])  // no scoped
        .mockResolvedValueOnce([{ userId: 'u-global-warden' }]);  // global fallback
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue(mockNotification);

      const result = await service.notifyWardens('u-student', 'Late', 'Student late');
      expect(result).toHaveLength(1);
    });

    it('should return empty array if no bed assignment', async () => {
      mockPrisma.bedAssignment.findFirst.mockResolvedValue(null);
      const result = await service.notifyWardens('u-student', 'Late', 'Student late');
      expect(result).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // findByUser
  // -----------------------------------------------------------------------
  describe('findByUser', () => {
    it('should return paginated notifications for user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.findByUser('u-parent', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should support search in title/message', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findByUser('u-parent', { search: 'exit' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // getUnreadCount
  // -----------------------------------------------------------------------
  describe('getUnreadCount', () => {
    it('should return count of unread SENT notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const result = await service.getUnreadCount('u-parent');
      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { recipientId: 'u-parent', readAt: null, state: 'SENT' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // markRead
  // -----------------------------------------------------------------------
  describe('markRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue({ ...mockNotification, readAt: new Date() });

      const result = await service.markRead('notif-1', 'u-parent');
      expect(result.success).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-1' },
          data: expect.objectContaining({ readAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw if notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markRead('bad', 'u-parent')).rejects.toThrow(NotFoundException);
    });

    it('should throw if user does not own notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        recipientId: 'u-other',
      });
      await expect(service.markRead('notif-1', 'u-parent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // markAllRead
  // -----------------------------------------------------------------------
  describe('markAllRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      const result = await service.markAllRead('u-parent');
      expect(result.success).toBe(true);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: 'u-parent', readAt: null },
        }),
      );
    });
  });
});
