import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, MenuStatus, MessType, DayOfWeek, MealType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto, QueryStatsDto, QueryReportDto } from './dto';

@Injectable()
export class MessService {
  private readonly logger = new Logger(MessService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Menu CRUD
  // =========================================================================

  async createMenu(dto: CreateMenuDto, createdById: string) {
    const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.hostelId } });
    if (!hostel) throw new NotFoundException('Hostel not found');

    let menu;
    try {
      menu = await this.prisma.messMenu.create({
        data: {
          hostelId: dto.hostelId,
          name: dto.name.trim(),
          messType: dto.messType as MessType,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          createdById,
          notes: dto.notes?.trim(),
          status: MenuStatus.DRAFT,
          items: {
            create: dto.items.map((item) => ({
              day: item.day as DayOfWeek,
              mealType: item.mealType as MealType,
              items: item.items.trim(),
              specialNote: item.specialNote?.trim(),
            })),
          },
        },
        include: {
          items: { orderBy: [{ day: 'asc' }, { mealType: 'asc' }] },
          hostel: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          `A ${MenuStatus.DRAFT} menu for this hostel and mess type already exists. Update or archive it first.`,
        );
      }
      throw e;
    }

    this.logger.log(`Menu "${menu.name}" created for hostel ${hostel.name} by ${createdById}`);
    return menu;
  }

  async findMenuById(id: string) {
    const menu = await this.prisma.messMenu.findUnique({
      where: { id },
      include: {
        items: { orderBy: [{ day: 'asc' }, { mealType: 'asc' }] },
        hostel: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!menu) throw new NotFoundException('Menu not found');
    return menu;
  }

  async findMenus(query: QueryMenuDto) {
    const { page = 1, limit = 20, hostelId, messType, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MessMenuWhereInput = {};
    if (hostelId) where.hostelId = hostelId;
    if (messType) where.messType = messType as MessType;
    if (status) where.status = status as MenuStatus;

    const [data, total] = await Promise.all([
      this.prisma.messMenu.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          hostel: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.messMenu.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateMenu(id: string, dto: UpdateMenuDto) {
    const menu = await this.findMenuById(id);
    if (menu.status === MenuStatus.ARCHIVED) {
      throw new BadRequestException('Cannot update an archived menu');
    }

    const data: Prisma.MessMenuUpdateInput = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.effectiveFrom) data.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) data.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;

    // If items provided, replace all items
    if (dto.items && dto.items.length > 0) {
      await this.prisma.messMenuItem.deleteMany({ where: { menuId: id } });
      await this.prisma.messMenuItem.createMany({
        data: dto.items.map((item) => ({
          menuId: id,
          day: item.day as DayOfWeek,
          mealType: item.mealType as MealType,
          items: item.items.trim(),
          specialNote: item.specialNote?.trim(),
        })),
      });
    }

    await this.prisma.messMenu.update({ where: { id }, data });
    return this.findMenuById(id);
  }

  async activateMenu(id: string) {
    const menu = await this.findMenuById(id);
    if (menu.status === MenuStatus.ACTIVE) {
      throw new BadRequestException('Menu is already active');
    }

    // Deactivate any existing active menu for same hostel + messType
    await this.prisma.messMenu.updateMany({
      where: {
        hostelId: menu.hostelId,
        messType: menu.messType,
        status: MenuStatus.ACTIVE,
        id: { not: id },
      },
      data: { status: MenuStatus.ARCHIVED },
    });

    await this.prisma.messMenu.update({
      where: { id },
      data: { status: MenuStatus.ACTIVE },
    });

    this.logger.log(`Menu "${menu.name}" activated for hostel ${menu.hostelId}`);
    return this.findMenuById(id);
  }

  async archiveMenu(id: string) {
    const menu = await this.findMenuById(id);
    if (menu.status === MenuStatus.ARCHIVED) {
      throw new BadRequestException('Menu is already archived');
    }

    await this.prisma.messMenu.update({
      where: { id },
      data: { status: MenuStatus.ARCHIVED },
    });

    return this.findMenuById(id);
  }

  // =========================================================================
  // Today & Week Menu
  // =========================================================================

  async getTodayMenu(hostelId: string, messType?: string) {
    const today = new Date();
    const dayNames: DayOfWeek[] = [
      DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    const todayDay = dayNames[today.getDay()];

    const where: Prisma.MessMenuWhereInput = {
      hostelId,
      status: MenuStatus.ACTIVE,
    };
    if (messType) where.messType = messType as MessType;

    const menus = await this.prisma.messMenu.findMany({
      where,
      include: {
        items: {
          where: { day: todayDay },
          orderBy: { mealType: 'asc' },
        },
        hostel: { select: { id: true, code: true, name: true } },
      },
    });

    return { date: today.toISOString().split('T')[0], day: todayDay, menus };
  }

  async getWeekMenu(hostelId: string, messType?: string) {
    const where: Prisma.MessMenuWhereInput = {
      hostelId,
      status: MenuStatus.ACTIVE,
    };
    if (messType) where.messType = messType as MessType;

    const menus = await this.prisma.messMenu.findMany({
      where,
      include: {
        items: { orderBy: [{ day: 'asc' }, { mealType: 'asc' }] },
        hostel: { select: { id: true, code: true, name: true } },
      },
    });

    return menus;
  }

  // =========================================================================
  // Stats & Reports
  // =========================================================================

  async getStats(query: QueryStatsDto) {
    const { hostelId, fromDate, toDate } = query;
    const now = new Date();
    const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = toDate ? new Date(toDate) : now;

    const scanWhere: Prisma.MealScanWhereInput = {
      date: { gte: start, lte: end },
      status: 'SCANNED',
    };
    if (hostelId) scanWhere.hostelId = hostelId;

    const [
      totalScans,
      guestScans,
      byMealType,
      pendingRebates,
      avgRating,
    ] = await Promise.all([
      this.prisma.mealScan.count({ where: { ...scanWhere, isGuest: false } }),
      this.prisma.mealScan.count({ where: { ...scanWhere, isGuest: true } }),
      this.prisma.mealScan.groupBy({
        by: ['mealType'],
        where: { ...scanWhere, isGuest: false },
        _count: { id: true },
      }),
      this.prisma.messRebate.count({
        where: { status: 'PENDING', ...(hostelId ? { hostelId } : {}) },
      }),
      this.prisma.mealFeedback.aggregate({
        where: {
          date: { gte: start, lte: end },
          ...(hostelId ? { hostelId } : {}),
        },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    return {
      period: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
      totalMealsServed: totalScans,
      guestMeals: guestScans,
      byMealType: byMealType.map((m) => ({ mealType: m.mealType, count: m._count.id })),
      pendingRebates,
      feedback: {
        avgRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : null,
        totalFeedback: avgRating._count.id,
      },
    };
  }

  async getConsumptionReport(query: QueryReportDto) {
    const { hostelId, fromDate, toDate, mealType } = query;
    const now = new Date();
    const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = toDate ? new Date(toDate) : now;

    const where: Prisma.MealScanWhereInput = {
      hostelId,
      date: { gte: start, lte: end },
      status: 'SCANNED',
      isGuest: false,
    };
    if (mealType) where.mealType = mealType as MealType;

    const scans = await this.prisma.mealScan.findMany({
      where,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, usn: true },
        },
      },
      orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
    });

    // Group by student
    const byStudent = new Map<string, { student: any; meals: Record<string, number>; total: number }>();
    for (const scan of scans) {
      const key = scan.studentId;
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          student: scan.student,
          meals: { BREAKFAST: 0, LUNCH: 0, SNACKS: 0, DINNER: 0 },
          total: 0,
        });
      }
      const entry = byStudent.get(key)!;
      entry.meals[scan.mealType]++;
      entry.total++;
    }

    return {
      period: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
      hostelId,
      data: Array.from(byStudent.values()).sort((a, b) => b.total - a.total),
    };
  }

  async getFeedbackReport(query: QueryReportDto) {
    const { hostelId, fromDate, toDate } = query;
    const now = new Date();
    const start = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = toDate ? new Date(toDate) : now;

    const where: Prisma.MealFeedbackWhereInput = {
      hostelId,
      date: { gte: start, lte: end },
    };

    const [byMealType, recentComments, ratingDistribution] = await Promise.all([
      this.prisma.mealFeedback.groupBy({
        by: ['mealType'],
        where,
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.mealFeedback.findMany({
        where: { ...where, comment: { not: null } },
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          mealType: true,
          date: true,
          rating: true,
          comment: true,
          isAnonymous: true,
          student: { select: { id: true, firstName: true, lastName: true } },
          createdAt: true,
        },
      }),
      this.prisma.mealFeedback.groupBy({
        by: ['rating'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      period: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
      byMealType: byMealType.map((m) => ({
        mealType: m.mealType,
        avgRating: m._avg.rating ? Math.round(m._avg.rating * 10) / 10 : null,
        count: m._count.id,
      })),
      ratingDistribution: ratingDistribution
        .sort((a, b) => a.rating - b.rating)
        .map((r) => ({ rating: r.rating, count: r._count.id })),
      recentComments: recentComments.map((c) => ({
        ...c,
        student: c.isAnonymous ? null : c.student,
      })),
    };
  }
}
