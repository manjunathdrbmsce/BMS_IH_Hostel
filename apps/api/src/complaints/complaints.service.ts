import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, ComplaintStatus, ComplaintCategory, ComplaintPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto, UpdateComplaintDto, ListComplaintsQueryDto } from './dto';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateComplaintDto) {
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

    const complaint = await this.prisma.complaint.create({
      data: {
        studentId: dto.studentId,
        hostelId: dto.hostelId,
        category: dto.category as ComplaintCategory,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        priority: (dto.priority as ComplaintPriority) || ComplaintPriority.MEDIUM,
        status: ComplaintStatus.OPEN,
      },
    });

    return this.findById(complaint.id);
  }

  async findById(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, usn: true },
        },
        hostel: {
          select: { id: true, code: true, name: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return complaint;
  }

  async findMany(query: ListComplaintsQueryDto) {
    const { page = 1, limit = 20, studentId, hostelId, status, category, priority, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ComplaintWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (hostelId) where.hostelId = hostelId;
    if (status) where.status = status as ComplaintStatus;
    if (category) where.category = category as ComplaintCategory;
    if (priority) where.priority = priority as ComplaintPriority;

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { usn: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, usn: true },
          },
          hostel: { select: { id: true, code: true, name: true } },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdateComplaintDto) {
    const complaint = await this.findById(id);

    const data: Prisma.ComplaintUpdateInput = {};

    if (dto.status) {
      data.status = dto.status as ComplaintStatus;
      if (dto.status === 'RESOLVED') {
        data.resolvedAt = new Date();
      }
    }
    if (dto.assignedToId !== undefined) {
      if (dto.assignedToId) {
        const staff = await this.prisma.user.findUnique({ where: { id: dto.assignedToId } });
        if (!staff) throw new NotFoundException('Assigned user not found');
        data.assignedTo = { connect: { id: dto.assignedToId } };
        // Auto-set status to ASSIGNED if still OPEN
        if (complaint.status === 'OPEN') {
          data.status = ComplaintStatus.ASSIGNED;
        }
      } else {
        data.assignedTo = { disconnect: true };
      }
    }
    if (dto.priority) data.priority = dto.priority as ComplaintPriority;
    if (dto.resolution) data.resolution = dto.resolution.trim();

    await this.prisma.complaint.update({ where: { id }, data });

    return this.findById(id);
  }

  async addComment(complaintId: string, userId: string, message: string) {
    await this.findById(complaintId); // 404 check

    const comment = await this.prisma.complaintComment.create({
      data: {
        complaintId,
        userId,
        message: message.trim(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return comment;
  }

  async getStats() {
    const [open, assigned, inProgress, resolved, closed, reopened] = await Promise.all([
      this.prisma.complaint.count({ where: { status: 'OPEN' } }),
      this.prisma.complaint.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.complaint.count({ where: { status: 'RESOLVED' } }),
      this.prisma.complaint.count({ where: { status: 'CLOSED' } }),
      this.prisma.complaint.count({ where: { status: 'REOPENED' } }),
    ]);

    const byCategory = await this.prisma.complaint.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return {
      open,
      assigned,
      inProgress,
      resolved,
      closed,
      reopened,
      total: open + assigned + inProgress + resolved + closed + reopened,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
    };
  }
}
