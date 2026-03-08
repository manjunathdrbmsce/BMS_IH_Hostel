import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, RebateStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRebateDto, QueryRebatesDto, ReviewRebateDto } from './dto';

const MIN_REBATE_DAYS = 3;

@Injectable()
export class MessRebateService {
  private readonly logger = new Logger(MessRebateService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Create Rebate Request
  // =========================================================================

  async createRebate(dto: CreateRebateDto, studentId: string) {
    const hostel = await this.prisma.hostel.findUnique({ where: { id: dto.hostelId } });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);

    if (toDate <= fromDate) {
      throw new BadRequestException('toDate must be after fromDate');
    }

    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days < MIN_REBATE_DAYS) {
      throw new BadRequestException(`Minimum ${MIN_REBATE_DAYS} days required for rebate`);
    }

    // If leaveId provided, verify leave exists and belongs to student
    if (dto.leaveId) {
      const leave = await this.prisma.leaveRequest.findUnique({ where: { id: dto.leaveId } });
      if (!leave) throw new NotFoundException('Leave request not found');
      if (leave.studentId !== studentId) {
        throw new BadRequestException('Leave request does not belong to this student');
      }
    }

    const totalMeals = days * 4; // 4 meals per day

    const rebate = await this.prisma.messRebate.create({
      data: {
        studentId,
        hostelId: dto.hostelId,
        fromDate,
        toDate,
        totalMeals,
        reason: dto.reason.trim(),
        leaveId: dto.leaveId,
        status: RebateStatus.PENDING,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, usn: true } },
        hostel: { select: { id: true, code: true, name: true } },
        leave: { select: { id: true, type: true, fromDate: true, toDate: true, status: true } },
      },
    });

    this.logger.log(`Rebate request created by ${studentId} for ${days} days at ${hostel.name}`);
    return rebate;
  }

  // =========================================================================
  // Find Rebates
  // =========================================================================

  async findRebateById(id: string) {
    const rebate = await this.prisma.messRebate.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, usn: true, email: true } },
        hostel: { select: { id: true, code: true, name: true } },
        leave: { select: { id: true, type: true, fromDate: true, toDate: true, status: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!rebate) throw new NotFoundException('Rebate not found');
    return rebate;
  }

  async findRebates(query: QueryRebatesDto) {
    const { page = 1, limit = 20, hostelId, studentId, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MessRebateWhereInput = {};
    if (hostelId) where.hostelId = hostelId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status as RebateStatus;

    const [data, total] = await Promise.all([
      this.prisma.messRebate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, usn: true } },
          hostel: { select: { id: true, code: true, name: true } },
          leave: { select: { id: true, type: true, status: true } },
        },
      }),
      this.prisma.messRebate.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // =========================================================================
  // Approve / Reject
  // =========================================================================

  async approveRebate(id: string, dto: ReviewRebateDto, reviewedById: string) {
    const rebate = await this.findRebateById(id);
    if (rebate.status !== 'PENDING') {
      throw new BadRequestException('Only pending rebates can be approved');
    }

    await this.prisma.messRebate.update({
      where: { id },
      data: {
        status: RebateStatus.APPROVED,
        amount: dto.amount,
        reviewedById,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes?.trim(),
      },
    });

    this.logger.log(`Rebate ${id} approved by ${reviewedById}, amount: ${dto.amount}`);
    return this.findRebateById(id);
  }

  async rejectRebate(id: string, dto: ReviewRebateDto, reviewedById: string) {
    const rebate = await this.findRebateById(id);
    if (rebate.status !== 'PENDING') {
      throw new BadRequestException('Only pending rebates can be rejected');
    }

    await this.prisma.messRebate.update({
      where: { id },
      data: {
        status: RebateStatus.REJECTED,
        reviewedById,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes?.trim(),
      },
    });

    this.logger.log(`Rebate ${id} rejected by ${reviewedById}`);
    return this.findRebateById(id);
  }

  // =========================================================================
  // Auto-create rebate from approved leave (cross-module hook)
  // =========================================================================

  async createAutoRebate(leaveId: string) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        student: { select: { id: true } },
        hostel: { select: { id: true } },
      },
    });
    if (!leave) return null;

    const days = Math.ceil(
      (leave.toDate.getTime() - leave.fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < MIN_REBATE_DAYS) return null;

    // Check if auto-rebate already exists for this leave
    const existing = await this.prisma.messRebate.findFirst({
      where: { leaveId },
    });
    if (existing) return existing;

    const rebate = await this.prisma.messRebate.create({
      data: {
        studentId: leave.studentId,
        hostelId: leave.hostelId,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        totalMeals: days * 4,
        reason: `Auto-generated from approved leave (${leave.type})`,
        leaveId,
        status: RebateStatus.PENDING,
      },
    });

    this.logger.log(`Auto-rebate ${rebate.id} created from leave ${leaveId}`);
    return rebate;
  }
}
