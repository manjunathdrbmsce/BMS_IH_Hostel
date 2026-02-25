import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, LeaveStatus, LeaveType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveRequestDto, ListLeaveQueryDto } from './dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeaveRequestDto) {
    // Verify student exists
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Verify hostel exists
    const hostel = await this.prisma.hostel.findUnique({
      where: { id: dto.hostelId },
    });
    if (!hostel) {
      throw new NotFoundException('Hostel not found');
    }

    // Validate date range
    const from = new Date(dto.fromDate);
    const to = new Date(dto.toDate);
    if (to <= from) {
      throw new BadRequestException('toDate must be after fromDate');
    }

    // Check for overlapping active leave
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        studentId: dto.studentId,
        status: { in: ['PENDING', 'PARENT_APPROVED', 'WARDEN_APPROVED'] },
        fromDate: { lte: to },
        toDate: { gte: from },
      },
    });
    if (overlapping) {
      throw new ConflictException('Student already has an overlapping leave request');
    }

    // Check policy maxLeaveDays if building linked
    if (hostel.buildingId) {
      const policy = await this.prisma.buildingPolicy.findFirst({
        where: { buildingId: hostel.buildingId, isActive: true },
        orderBy: { version: 'desc' },
      });
      if (policy) {
        const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
        if (days > policy.maxLeaveDays) {
          throw new BadRequestException(
            `Leave duration (${days} days) exceeds maximum allowed (${policy.maxLeaveDays} days)`,
          );
        }
      }
    }

    const leave = await this.prisma.leaveRequest.create({
      data: {
        studentId: dto.studentId,
        hostelId: dto.hostelId,
        type: dto.type as LeaveType,
        fromDate: from,
        toDate: to,
        reason: dto.reason.trim(),
        status: LeaveStatus.PENDING,
      },
    });

    return this.findById(leave.id);
  }

  async findById(id: string) {
    const leave = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, usn: true },
        },
        hostel: {
          select: { id: true, code: true, name: true },
        },
        warden: {
          select: { id: true, firstName: true, lastName: true },
        },
        parent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    return leave;
  }

  async findMany(query: ListLeaveQueryDto) {
    const { page = 1, limit = 20, studentId, hostelId, status, type, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveRequestWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (hostelId) where.hostelId = hostelId;
    if (status) where.status = status as LeaveStatus;
    if (type) where.type = type as LeaveType;

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { usn: { contains: search, mode: 'insensitive' } } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, usn: true },
          },
          hostel: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async parentApprove(id: string, parentId: string) {
    const leave = await this.findById(id);

    if (leave.status !== 'PENDING') {
      throw new ConflictException('Leave request is not in PENDING status');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.PARENT_APPROVED,
        parentApprovalAt: new Date(),
        parentId,
      },
    });

    return this.findById(id);
  }

  async wardenApprove(id: string, wardenId: string) {
    const leave = await this.findById(id);

    // Warden can approve from PENDING or PARENT_APPROVED
    if (!['PENDING', 'PARENT_APPROVED'].includes(leave.status)) {
      throw new ConflictException('Leave request cannot be approved in current status');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.WARDEN_APPROVED,
        wardenApprovalAt: new Date(),
        wardenId,
      },
    });

    return this.findById(id);
  }

  async reject(id: string, wardenId: string, rejectionReason: string) {
    const leave = await this.findById(id);

    if (['REJECTED', 'CANCELLED', 'WARDEN_APPROVED'].includes(leave.status)) {
      throw new ConflictException('Leave request cannot be rejected in current status');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
        wardenId,
      },
    });

    return this.findById(id);
  }

  async cancel(id: string, studentId: string) {
    const leave = await this.findById(id);

    if (leave.studentId !== studentId) {
      throw new ConflictException('Only the requesting student can cancel');
    }

    if (['CANCELLED', 'REJECTED'].includes(leave.status)) {
      throw new ConflictException('Leave request is already cancelled/rejected');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
    });

    return this.findById(id);
  }

  async getStats() {
    const [pending, parentApproved, wardenApproved, rejected, cancelled] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.leaveRequest.count({ where: { status: 'PARENT_APPROVED' } }),
      this.prisma.leaveRequest.count({ where: { status: 'WARDEN_APPROVED' } }),
      this.prisma.leaveRequest.count({ where: { status: 'REJECTED' } }),
      this.prisma.leaveRequest.count({ where: { status: 'CANCELLED' } }),
    ]);

    return {
      pending,
      parentApproved,
      wardenApproved,
      rejected,
      cancelled,
      total: pending + parentApproved + wardenApproved + rejected + cancelled,
    };
  }
}
