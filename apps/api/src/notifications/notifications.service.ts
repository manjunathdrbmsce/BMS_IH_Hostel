import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto';

export interface CreateNotificationInput {
  recipientId: string;
  channel?: NotificationChannel;
  title: string;
  message: string;
  violationId?: string;
  gateEntryId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Create + Dispatch
  // -----------------------------------------------------------------------

  async createNotification(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        channel: input.channel || 'IN_APP',
        title: input.title,
        message: input.message,
        violationId: input.violationId || null,
        gateEntryId: input.gateEntryId || null,
        state: 'PENDING',
      },
    });

    // Mark as SENT immediately for IN_APP (no external dispatch needed)
    if ((input.channel || 'IN_APP') === 'IN_APP') {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { state: 'SENT', sentAt: new Date() },
      });
    } else {
      // For EMAIL/SMS/PUSH — stub: log and mark SENT
      this.logger.log(
        `[STUB] Dispatching ${input.channel} notification to ${input.recipientId}: ${input.title}`,
      );
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { state: 'SENT', sentAt: new Date() },
      });
    }

    return notification;
  }

  /**
   * Send notification to all guardians of a student.
   */
  async notifyParents(
    studentId: string,
    title: string,
    message: string,
    gateEntryId?: string,
    violationId?: string,
  ) {
    const guardianLinks = await this.prisma.guardianLink.findMany({
      where: { studentId },
      select: { guardianId: true },
    });

    const notifications = [];
    for (const link of guardianLinks) {
      const n = await this.createNotification({
        recipientId: link.guardianId,
        channel: 'IN_APP',
        title,
        message,
        gateEntryId,
        violationId,
      });
      notifications.push(n);
    }

    return notifications;
  }

  /**
   * Send notification to wardens of a student's hostel.
   */
  async notifyWardens(
    studentId: string,
    title: string,
    message: string,
    gateEntryId?: string,
    violationId?: string,
  ) {
    // Find student's hostel via bed assignment
    const assignment = await this.prisma.bedAssignment.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: { bed: { include: { room: true } } },
    });

    if (!assignment?.bed?.room?.hostelId) return [];

    const hostelId = assignment.bed.room.hostelId;

    // Find wardens scoped to this hostel
    const wardenRoles = await this.prisma.userRole.findMany({
      where: {
        role: { name: { in: ['WARDEN', 'DEPUTY_WARDEN'] } },
        hostelId,
        revokedAt: null,
      },
      select: { userId: true },
    });

    // Fallback: find global wardens if no scoped wardens
    const globalWardens =
      wardenRoles.length === 0
        ? await this.prisma.userRole.findMany({
            where: {
              role: { name: { in: ['WARDEN', 'DEPUTY_WARDEN'] } },
              hostelId: null,
              revokedAt: null,
            },
            select: { userId: true },
          })
        : [];

    const allWardenIds = [
      ...new Set([
        ...wardenRoles.map((w) => w.userId),
        ...globalWardens.map((w) => w.userId),
      ]),
    ];

    const notifications = [];
    for (const userId of allWardenIds) {
      const n = await this.createNotification({
        recipientId: userId,
        channel: 'IN_APP',
        title,
        message,
        gateEntryId,
        violationId,
      });
      notifications.push(n);
    }

    return notifications;
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  async findByUser(userId: string, query: ListNotificationsQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { recipientId: userId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, readAt: null, state: 'SENT' },
    });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { success: true };
  }
}
