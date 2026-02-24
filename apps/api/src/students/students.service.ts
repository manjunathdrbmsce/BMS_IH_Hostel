import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStudentProfileDto,
  UpdateStudentProfileDto,
  ListStudentsQueryDto,
  CreateGuardianLinkDto,
  UpdateGuardianLinkDto,
} from './dto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Student Profiles
  // -----------------------------------------------------------------------

  async createProfile(dto: CreateStudentProfileDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    // Check no existing profile
    const existing = await this.prisma.studentProfile.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(`Student profile already exists for user ${dto.userId}`);
    }

    await this.prisma.studentProfile.create({
      data: {
        userId: dto.userId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        bloodGroup: dto.bloodGroup || null,
        gender: dto.gender || null,
        department: dto.department?.trim() || null,
        course: dto.course?.trim() || null,
        year: dto.year || null,
        semester: dto.semester || null,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
        emergencyContact: dto.emergencyContact?.trim() || null,
        permanentAddress: dto.permanentAddress?.trim() || null,
        medicalConditions: dto.medicalConditions?.trim() || null,
      },
    });

    return this.findProfileByUserId(dto.userId);
  }

  async findProfileByUserId(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            usn: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    // Also fetch guardian links and current bed assignment
    const [guardians, activeAssignment] = await Promise.all([
      this.prisma.guardianLink.findMany({
        where: { studentId: userId },
        include: {
          guardian: {
            select: { id: true, firstName: true, lastName: true, email: true, mobile: true },
          },
        },
        orderBy: { isPrimary: 'desc' },
      }),
      this.prisma.bedAssignment.findFirst({
        where: { studentId: userId, status: 'ACTIVE' },
        include: {
          bed: {
            include: {
              room: {
                include: {
                  hostel: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      ...profile,
      guardians: guardians.map((g) => ({
        id: g.id,
        guardianId: g.guardianId,
        relation: g.relation,
        isPrimary: g.isPrimary,
        guardian: g.guardian,
      })),
      currentAssignment: activeAssignment
        ? {
            id: activeAssignment.id,
            bedId: activeAssignment.bedId,
            bedNo: activeAssignment.bed.bedNo,
            roomNo: activeAssignment.bed.room.roomNo,
            floor: activeAssignment.bed.room.floor,
            hostel: activeAssignment.bed.room.hostel,
            assignedAt: activeAssignment.assignedAt,
          }
        : null,
    };
  }

  async findProfileById(id: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }
    return this.findProfileByUserId(profile.userId);
  }

  async findMany(query: ListStudentsQueryDto) {
    const { page = 1, limit = 20, search, department, year } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentProfileWhereInput = {};

    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { usn: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }

    if (year) {
      where.year = year;
    }

    const [profiles, total] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { user: { firstName: 'asc' } },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              usn: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.studentProfile.count({ where }),
    ]);

    return {
      data: profiles,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto) {
    const existing = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new NotFoundException('Student profile not found');
    }

    const data: Prisma.StudentProfileUpdateInput = {};
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.bloodGroup !== undefined) data.bloodGroup = dto.bloodGroup || null;
    if (dto.gender !== undefined) data.gender = dto.gender || null;
    if (dto.department !== undefined) data.department = dto.department?.trim() || null;
    if (dto.course !== undefined) data.course = dto.course?.trim() || null;
    if (dto.year !== undefined) data.year = dto.year || null;
    if (dto.semester !== undefined) data.semester = dto.semester || null;
    if (dto.admissionDate !== undefined) data.admissionDate = dto.admissionDate ? new Date(dto.admissionDate) : null;
    if (dto.emergencyContact !== undefined) data.emergencyContact = dto.emergencyContact?.trim() || null;
    if (dto.permanentAddress !== undefined) data.permanentAddress = dto.permanentAddress?.trim() || null;
    if (dto.medicalConditions !== undefined) data.medicalConditions = dto.medicalConditions?.trim() || null;

    await this.prisma.studentProfile.update({ where: { userId }, data });

    return this.findProfileByUserId(userId);
  }

  // -----------------------------------------------------------------------
  // Guardian Links
  // -----------------------------------------------------------------------

  async createGuardianLink(dto: CreateGuardianLinkDto) {
    // Verify both users exist
    const [student, guardian] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.studentId } }),
      this.prisma.user.findUnique({ where: { id: dto.guardianId } }),
    ]);

    if (!student) throw new NotFoundException(`Student user ${dto.studentId} not found`);
    if (!guardian) throw new NotFoundException(`Guardian user ${dto.guardianId} not found`);

    // Check no duplicate
    const existing = await this.prisma.guardianLink.findUnique({
      where: {
        studentId_guardianId: {
          studentId: dto.studentId,
          guardianId: dto.guardianId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Guardian link already exists');
    }

    // If isPrimary, un-primary others
    if (dto.isPrimary) {
      await this.prisma.guardianLink.updateMany({
        where: { studentId: dto.studentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const link = await this.prisma.guardianLink.create({
      data: {
        studentId: dto.studentId,
        guardianId: dto.guardianId,
        relation: dto.relation.trim(),
        isPrimary: dto.isPrimary ?? false,
      },
      include: {
        guardian: {
          select: { id: true, firstName: true, lastName: true, email: true, mobile: true },
        },
      },
    });

    return link;
  }

  async updateGuardianLink(id: string, dto: UpdateGuardianLinkDto) {
    const link = await this.prisma.guardianLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Guardian link not found');

    if (dto.isPrimary) {
      await this.prisma.guardianLink.updateMany({
        where: { studentId: link.studentId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.guardianLink.update({
      where: { id },
      data: {
        ...(dto.relation !== undefined && { relation: dto.relation.trim() }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
      },
      include: {
        guardian: {
          select: { id: true, firstName: true, lastName: true, email: true, mobile: true },
        },
      },
    });
  }

  async removeGuardianLink(id: string) {
    const link = await this.prisma.guardianLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Guardian link not found');

    await this.prisma.guardianLink.delete({ where: { id } });
    return { message: 'Guardian link removed' };
  }

  async getGuardiansForStudent(studentId: string) {
    return this.prisma.guardianLink.findMany({
      where: { studentId },
      include: {
        guardian: {
          select: { id: true, firstName: true, lastName: true, email: true, mobile: true },
        },
      },
      orderBy: { isPrimary: 'desc' },
    });
  }
}
