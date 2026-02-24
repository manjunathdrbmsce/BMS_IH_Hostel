import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, AssignmentStatus, BedStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignBedDto,
  TransferBedDto,
  VacateBedDto,
  ListAssignmentsQueryDto,
} from './dto';

@Injectable()
export class AllotmentsService {
  private readonly logger = new Logger(AllotmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign a student to a bed.
   * - Bed must be VACANT
   * - Student must not have an ACTIVE assignment
   */
  async assign(dto: AssignBedDto, assignedById?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Verify student exists
      const student = await tx.user.findUnique({ where: { id: dto.studentId } });
      if (!student) throw new NotFoundException(`Student ${dto.studentId} not found`);

      // Verify bed exists and is vacant
      const bed = await tx.bed.findUnique({
        where: { id: dto.bedId },
        include: { room: { include: { hostel: true } } },
      });
      if (!bed) throw new NotFoundException(`Bed ${dto.bedId} not found`);
      if (bed.status !== BedStatus.VACANT) {
        throw new ConflictException(`Bed ${bed.bedNo} is not vacant (current: ${bed.status})`);
      }

      // Check student doesn't already have active assignment
      const activeAssignment = await tx.bedAssignment.findFirst({
        where: { studentId: dto.studentId, status: AssignmentStatus.ACTIVE },
      });
      if (activeAssignment) {
        throw new ConflictException(
          `Student already has an active bed assignment. Vacate or transfer first.`,
        );
      }

      // Create assignment
      const assignment = await tx.bedAssignment.create({
        data: {
          studentId: dto.studentId,
          bedId: dto.bedId,
          status: AssignmentStatus.ACTIVE,
          assignedById: assignedById || null,
          reason: dto.reason?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });

      // Update bed status + student link
      await tx.bed.update({
        where: { id: dto.bedId },
        data: { status: BedStatus.OCCUPIED, studentId: dto.studentId },
      });

      this.logger.log(
        `Bed ${bed.bedNo} in ${bed.room.hostel.code}/${bed.room.roomNo} assigned to student ${student.firstName} ${student.lastName}`,
      );

      return this.findById(assignment.id);
    });
  }

  /**
   * Transfer a student from current bed to a new bed.
   * - Old assignment → TRANSFERRED
   * - New bed must be VACANT
   */
  async transfer(dto: TransferBedDto, assignedById?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Find current active assignment
      const current = await tx.bedAssignment.findFirst({
        where: { studentId: dto.studentId, status: AssignmentStatus.ACTIVE },
        include: { bed: true },
      });
      if (!current) {
        throw new NotFoundException(`No active assignment found for student ${dto.studentId}`);
      }

      // Verify new bed is vacant
      const newBed = await tx.bed.findUnique({
        where: { id: dto.newBedId },
        include: { room: { include: { hostel: true } } },
      });
      if (!newBed) throw new NotFoundException(`New bed ${dto.newBedId} not found`);
      if (newBed.status !== BedStatus.VACANT) {
        throw new ConflictException(`New bed ${newBed.bedNo} is not vacant`);
      }

      // Close old assignment
      await tx.bedAssignment.update({
        where: { id: current.id },
        data: { status: AssignmentStatus.TRANSFERRED, vacatedAt: new Date() },
      });

      // Vacate old bed
      await tx.bed.update({
        where: { id: current.bedId },
        data: { status: BedStatus.VACANT, studentId: null },
      });

      // Create new assignment
      const assignment = await tx.bedAssignment.create({
        data: {
          studentId: dto.studentId,
          bedId: dto.newBedId,
          status: AssignmentStatus.ACTIVE,
          assignedById: assignedById || null,
          reason: dto.reason?.trim() || `Transfer from bed ${current.bed.bedNo}`,
          notes: dto.notes?.trim() || null,
        },
      });

      // Occupy new bed
      await tx.bed.update({
        where: { id: dto.newBedId },
        data: { status: BedStatus.OCCUPIED, studentId: dto.studentId },
      });

      this.logger.log(
        `Student ${dto.studentId} transferred from bed ${current.bed.bedNo} to ${newBed.bedNo}`,
      );

      return this.findById(assignment.id);
    });
  }

  /**
   * Vacate a student from their current bed.
   */
  async vacate(dto: VacateBedDto, assignedById?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.bedAssignment.findFirst({
        where: { studentId: dto.studentId, status: AssignmentStatus.ACTIVE },
        include: { bed: true },
      });
      if (!current) {
        throw new NotFoundException(`No active assignment found for student ${dto.studentId}`);
      }

      // Close assignment
      await tx.bedAssignment.update({
        where: { id: current.id },
        data: {
          status: AssignmentStatus.VACATED,
          vacatedAt: new Date(),
          reason: dto.reason?.trim() || current.reason,
          notes: dto.notes?.trim() || current.notes,
        },
      });

      // Vacate bed
      await tx.bed.update({
        where: { id: current.bedId },
        data: { status: BedStatus.VACANT, studentId: null },
      });

      this.logger.log(`Student ${dto.studentId} vacated bed ${current.bed.bedNo}`);

      return { message: 'Bed vacated successfully' };
    });
  }

  async findById(id: string) {
    const assignment = await this.prisma.bedAssignment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            usn: true,
          },
        },
        bed: {
          include: {
            room: {
              include: {
                hostel: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async findMany(query: ListAssignmentsQueryDto) {
    const { page = 1, limit = 20, studentId, bedId, status, hostelId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BedAssignmentWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (bedId) where.bedId = bedId;
    if (status) where.status = status as AssignmentStatus;
    if (hostelId) {
      where.bed = { room: { hostelId } };
    }

    const [assignments, total] = await Promise.all([
      this.prisma.bedAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assignedAt: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, usn: true },
          },
          bed: {
            include: {
              room: {
                include: {
                  hostel: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
          assignedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.bedAssignment.count({ where }),
    ]);

    return {
      data: assignments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [totalActive, totalVacated, totalTransferred] = await Promise.all([
      this.prisma.bedAssignment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.bedAssignment.count({ where: { status: 'VACATED' } }),
      this.prisma.bedAssignment.count({ where: { status: 'TRANSFERRED' } }),
    ]);

    return {
      activeAssignments: totalActive,
      totalVacated,
      totalTransferred,
      totalHistory: totalActive + totalVacated + totalTransferred,
    };
  }
}
