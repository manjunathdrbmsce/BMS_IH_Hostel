import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, MealType, MealScanStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ScanMealDto, ScanGuestDto, QueryScansDto, CreateFeedbackDto } from './dto';

/** Meal time windows (IST hours). Configurable per hostel in future. */
const MEAL_WINDOWS: Record<string, { start: number; end: number }> = {
  BREAKFAST: { start: 7, end: 10 },
  LUNCH: { start: 12, end: 14 },
  SNACKS: { start: 16, end: 18 },
  DINNER: { start: 19, end: 22 },
};

const CANCEL_GRACE_MINUTES = 15;

@Injectable()
export class MessScanService {
  private readonly logger = new Logger(MessScanService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Scan Meal
  // =========================================================================

  async scanMeal(dto: ScanMealDto, scannedById: string) {
    // Verify student exists
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
      select: { id: true, firstName: true, lastName: true, usn: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Verify hostel exists
    const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.hostelId } });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const today = new Date();
    const dateOnly = new Date(today.toISOString().split('T')[0]);

    // Check duplicate scan
    const existing = await this.prisma.mealScan.findUnique({
      where: {
        studentId_date_mealType: {
          studentId: dto.studentId,
          date: dateOnly,
          mealType: dto.mealType as MealType,
        },
      },
    });
    if (existing && existing.status === 'SCANNED') {
      throw new ConflictException('Student already scanned for this meal today');
    }

    const scan = await this.prisma.mealScan.create({
      data: {
        studentId: dto.studentId,
        hostelId: dto.hostelId,
        date: dateOnly,
        mealType: dto.mealType as MealType,
        scannedById,
        status: MealScanStatus.SCANNED,
        notes: dto.notes?.trim(),
        deviceFingerprint: dto.deviceFingerprint,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, usn: true } },
        hostel: { select: { id: true, code: true, name: true } },
      },
    });

    this.logger.log(`Meal scan: ${student.usn || student.id} - ${dto.mealType} at ${hostel.name}`);
    return scan;
  }

  // =========================================================================
  // Guest Meal
  // =========================================================================

  async scanGuestMeal(dto: ScanGuestDto, scannedById: string) {
    const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.hostelId } });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const student = await this.prisma.user.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('Host student not found');

    const today = new Date();
    const dateOnly = new Date(today.toISOString().split('T')[0]);

    let scan;
    try {
      scan = await this.prisma.mealScan.create({
        data: {
          studentId: dto.studentId,
          hostelId: dto.hostelId,
          date: dateOnly,
          mealType: dto.mealType as MealType,
          scannedById,
          status: MealScanStatus.SCANNED,
          isGuest: true,
          guestName: dto.guestName.trim(),
          guestCount: dto.guestCount || 1,
          notes: dto.notes?.trim(),
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, usn: true } },
          hostel: { select: { id: true, code: true, name: true } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          'A meal scan already exists for this student and meal type today. Guest meals share the host student constraint.',
        );
      }
      throw e;
    }

    this.logger.log(`Guest meal: ${dto.guestCount || 1} guest(s) by ${student.firstName} at ${hostel.name}`);
    return scan;
  }

  // =========================================================================
  // Cancel Scan (within grace period)
  // =========================================================================

  async cancelScan(scanId: string) {
    const scan = await this.prisma.mealScan.findUnique({ where: { id: scanId } });
    if (!scan) throw new NotFoundException('Scan not found');
    if (scan.status === 'CANCELLED') throw new BadRequestException('Scan already cancelled');

    const elapsed = (Date.now() - scan.scannedAt.getTime()) / 60000;
    if (elapsed > CANCEL_GRACE_MINUTES) {
      throw new BadRequestException(`Cannot cancel scan after ${CANCEL_GRACE_MINUTES} minutes`);
    }

    await this.prisma.mealScan.update({
      where: { id: scanId },
      data: { status: MealScanStatus.CANCELLED },
    });

    return { success: true, message: 'Scan cancelled' };
  }

  // =========================================================================
  // List Scans
  // =========================================================================

  async findScans(query: QueryScansDto) {
    const { page = 1, limit = 20, hostelId, studentId, mealType, fromDate, toDate, isGuest } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MealScanWhereInput = {};
    if (hostelId) where.hostelId = hostelId;
    if (studentId) where.studentId = studentId;
    if (mealType) where.mealType = mealType as MealType;
    if (isGuest !== undefined) where.isGuest = isGuest;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.mealScan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scannedAt: 'desc' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, usn: true } },
          hostel: { select: { id: true, code: true, name: true } },
          scannedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.mealScan.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // =========================================================================
  // Live Meal Count
  // =========================================================================

  async getLiveCounts(hostelId?: string) {
    const today = new Date();
    const dateOnly = new Date(today.toISOString().split('T')[0]);

    // Determine current meal slot
    const hour = today.getHours();
    let currentMeal: string | null = null;
    for (const [meal, window] of Object.entries(MEAL_WINDOWS)) {
      if (hour >= window.start && hour < window.end) {
        currentMeal = meal;
        break;
      }
    }

    const where: Prisma.MealScanWhereInput = {
      date: dateOnly,
      status: 'SCANNED',
    };
    if (hostelId) where.hostelId = hostelId;

    const todayCounts = await this.prisma.mealScan.groupBy({
      by: ['mealType', 'isGuest'],
      where,
      _count: { id: true },
    });

    const result: Record<string, { students: number; guests: number }> = {
      BREAKFAST: { students: 0, guests: 0 },
      LUNCH: { students: 0, guests: 0 },
      SNACKS: { students: 0, guests: 0 },
      DINNER: { students: 0, guests: 0 },
    };

    for (const row of todayCounts) {
      const key = row.isGuest ? 'guests' : 'students';
      result[row.mealType][key] = row._count.id;
    }

    return { date: dateOnly.toISOString().split('T')[0], currentMeal, counts: result };
  }

  // =========================================================================
  // Student Self-Service
  // =========================================================================

  async getStudentHistory(studentId: string, query: QueryScansDto) {
    return this.findScans({ ...query, studentId });
  }

  async getStudentStats(studentId: string, hostelId?: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const where: Prisma.MealScanWhereInput = {
      studentId,
      date: { gte: monthStart, lte: now },
      status: 'SCANNED',
      isGuest: false,
    };
    if (hostelId) where.hostelId = hostelId;

    const byMealType = await this.prisma.mealScan.groupBy({
      by: ['mealType'],
      where,
      _count: { id: true },
    });

    const total = byMealType.reduce((sum, m) => sum + m._count.id, 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalPossible = daysInMonth * 4; // 4 meals per day

    return {
      month: now.toISOString().substring(0, 7),
      byMealType: byMealType.map((m) => ({ mealType: m.mealType, count: m._count.id })),
      totalMeals: total,
      totalPossible,
      percentage: Math.round((total / totalPossible) * 100),
    };
  }

  // =========================================================================
  // Feedback
  // =========================================================================

  async submitFeedback(dto: CreateFeedbackDto, studentId: string) {
    const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.hostelId } });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const dateOnly = new Date(dto.date);

    // Check if already submitted feedback for this meal
    const existing = await this.prisma.mealFeedback.findUnique({
      where: {
        studentId_date_mealType: {
          studentId,
          date: dateOnly,
          mealType: dto.mealType as MealType,
        },
      },
    });
    if (existing) throw new ConflictException('Feedback already submitted for this meal');

    const feedback = await this.prisma.mealFeedback.create({
      data: {
        studentId,
        hostelId: dto.hostelId,
        date: dateOnly,
        mealType: dto.mealType as MealType,
        rating: dto.rating,
        comment: dto.comment?.trim(),
        isAnonymous: dto.isAnonymous ?? false,
      },
    });

    return feedback;
  }
}
