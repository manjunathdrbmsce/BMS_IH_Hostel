import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, NoticePriority, NoticeScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoticeDto, UpdateNoticeDto, ListNoticesQueryDto } from './dto';

@Injectable()
export class NoticesService {
  private readonly logger = new Logger(NoticesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNoticeDto, publishedById: string) {
    const scope = (dto.scope || 'ALL') as NoticeScope;

    // Validate scope–target consistency
    if (scope === 'BUILDING' && !dto.targetBuildingId) {
      throw new BadRequestException('targetBuildingId is required when scope is BUILDING');
    }
    if (scope === 'HOSTEL' && !dto.targetHostelId) {
      throw new BadRequestException('targetHostelId is required when scope is HOSTEL');
    }

    // Verify targets exist
    if (dto.targetBuildingId) {
      const building = await this.prisma.building.findUnique({ where: { id: dto.targetBuildingId } });
      if (!building) throw new NotFoundException('Target building not found');
    }
    if (dto.targetHostelId) {
      const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.targetHostelId } });
      if (!hostel) throw new NotFoundException('Target hostel not found');
    }

    const notice = await this.prisma.notice.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        priority: (dto.priority as NoticePriority) || NoticePriority.INFO,
        scope,
        targetBuildingId: dto.targetBuildingId || null,
        targetHostelId: dto.targetHostelId || null,
        publishedById,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return this.findById(notice.id);
  }

  async findById(id: string) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
      include: {
        publishedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        targetBuilding: {
          select: { id: true, code: true, name: true },
        },
        targetHostel: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    // Get read count
    const readCount = await this.prisma.noticeRecipient.count({
      where: { noticeId: id, readAt: { not: null } },
    });

    return { ...notice, readCount };
  }

  async findMany(query: ListNoticesQueryDto) {
    const { page = 1, limit = 20, scope, priority, activeOnly = true, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NoticeWhereInput = {};

    if (scope) where.scope = scope as NoticeScope;
    if (priority) where.priority = priority as NoticePriority;
    if (activeOnly) where.isActive = true;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          publishedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          targetBuilding: { select: { id: true, code: true, name: true } },
          targetHostel: { select: { id: true, code: true, name: true } },
          _count: { select: { recipients: true } },
        },
      }),
      this.prisma.notice.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdateNoticeDto) {
    await this.findById(id);

    const data: Prisma.NoticeUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.body !== undefined) data.body = dto.body.trim();
    if (dto.priority) data.priority = dto.priority as NoticePriority;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    await this.prisma.notice.update({ where: { id }, data });

    return this.findById(id);
  }

  async markRead(noticeId: string, userId: string) {
    await this.findById(noticeId); // 404 check

    const existing = await this.prisma.noticeRecipient.findUnique({
      where: { noticeId_userId: { noticeId, userId } },
    });

    if (existing) {
      if (!existing.readAt) {
        await this.prisma.noticeRecipient.update({
          where: { id: existing.id },
          data: { readAt: new Date() },
        });
      }
      return { alreadyRead: !!existing.readAt };
    }

    await this.prisma.noticeRecipient.create({
      data: { noticeId, userId, readAt: new Date() },
    });

    return { marked: true };
  }

  async getStats() {
    const [total, active, expired] = await Promise.all([
      this.prisma.notice.count(),
      this.prisma.notice.count({ where: { isActive: true } }),
      this.prisma.notice.count({
        where: { expiresAt: { lt: new Date() }, isActive: true },
      }),
    ]);

    const byPriority = await this.prisma.notice.groupBy({
      by: ['priority'],
      _count: { id: true },
      where: { isActive: true },
    });

    const byScope = await this.prisma.notice.groupBy({
      by: ['scope'],
      _count: { id: true },
      where: { isActive: true },
    });

    return {
      total,
      active,
      expired,
      inactive: total - active,
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
      byScope: byScope.map((s) => ({ scope: s.scope, count: s._count.id })),
    };
  }
}
