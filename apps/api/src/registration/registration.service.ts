import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  RegistrationStatus,
  AdmissionMode,
  BedStatus,
  AssignmentStatus,
  FeeType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SaveDraftDto,
  SubmitRegistrationDto,
  ReviewRegistrationDto,
  AllotRegistrationDto,
  RecordFeeDto,
  ListRegistrationsQueryDto,
  CreateRegistrationDto,
} from './dto';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Application Number Generator
  // =========================================================================

  private async generateApplicationNo(academicYear: string): Promise<string> {
    const prefix = `IH-${academicYear.split('-')[0]}-`;

    const lastReg = await this.prisma.hostelRegistration.findFirst({
      where: { applicationNo: { startsWith: prefix } },
      orderBy: { applicationNo: 'desc' },
      select: { applicationNo: true },
    });

    let nextNum = 1;
    if (lastReg) {
      const lastNumStr = lastReg.applicationNo.replace(prefix, '');
      nextNum = parseInt(lastNumStr, 10) + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  // =========================================================================
  // Student: Start a new registration (DRAFT)
  // =========================================================================

  async startRegistration(studentId: string, dto: CreateRegistrationDto) {
    // Check no existing active registration for same academic year
    const existing = await this.prisma.hostelRegistration.findFirst({
      where: {
        studentId,
        academicYear: dto.academicYear,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
    });

    if (existing) {
      throw new ConflictException(
        `You already have a registration (${existing.applicationNo}) for academic year ${dto.academicYear}`,
      );
    }

    const applicationNo = await this.generateApplicationNo(dto.academicYear);

    const registration = await this.prisma.hostelRegistration.create({
      data: {
        applicationNo,
        studentId,
        academicYear: dto.academicYear,
        hostelId: dto.hostelId || null,
        roomTypePreference: dto.roomTypePreference || null,
        messType: dto.messType || null,
        previousHostelHistory: dto.previousHostelHistory || null,
        status: RegistrationStatus.DRAFT,
      },
    });

    this.logger.log(
      `Registration ${applicationNo} created for student ${studentId}`,
    );

    return this.findById(registration.id);
  }

  // =========================================================================
  // Student: Save draft (partial data at any step)
  // =========================================================================

  async saveDraft(registrationId: string, studentId: string, dto: SaveDraftDto) {
    const reg = await this.prisma.hostelRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.studentId !== studentId) throw new ForbiddenException('Not your registration');
    if (!['DRAFT', 'DOCUMENTS_PENDING'].includes(reg.status)) {
      throw new BadRequestException('Cannot edit a submitted registration');
    }

    // Update student profile fields
    const profileData: Record<string, any> = {};

    if (dto.personalDetails) {
      const p = dto.personalDetails;
      if (p.dateOfBirth) profileData.dateOfBirth = new Date(p.dateOfBirth);
      if (p.gender) profileData.gender = p.gender;
      if (p.bloodGroup) profileData.bloodGroup = p.bloodGroup;
      if (p.motherTongue) profileData.motherTongue = p.motherTongue;
      if (p.nationality) profileData.nationality = p.nationality;
      if (p.religion) profileData.religion = p.religion;
      if (p.category) profileData.category = p.category;
      if (p.pucPercentage !== undefined) profileData.pucPercentage = p.pucPercentage;
      if (p.admissionMode) profileData.admissionMode = p.admissionMode as AdmissionMode;
      if (p.photoUrl) profileData.photoUrl = p.photoUrl;
    }

    if (dto.academicDetails) {
      const a = dto.academicDetails;
      if (a.department) profileData.department = a.department;
      if (a.course) profileData.course = a.course;
      if (a.year) profileData.year = a.year;
      if (a.semester) profileData.semester = a.semester;
      if (a.admissionDate) profileData.admissionDate = new Date(a.admissionDate);
    }

    if (dto.familyDetails) {
      const f = dto.familyDetails;
      if (f.fatherName) profileData.fatherName = f.fatherName;
      if (f.motherName) profileData.motherName = f.motherName;
      if (f.fatherOccupation) profileData.fatherOccupation = f.fatherOccupation;
      if (f.motherOccupation) profileData.motherOccupation = f.motherOccupation;
      if (f.fatherEmail) profileData.fatherEmail = f.fatherEmail;
      if (f.fatherMobile) profileData.fatherMobile = f.fatherMobile;
      if (f.fatherLandline) profileData.fatherLandline = f.fatherLandline;
      if (f.motherEmail) profileData.motherEmail = f.motherEmail;
      if (f.motherMobile) profileData.motherMobile = f.motherMobile;
      if (f.motherLandline) profileData.motherLandline = f.motherLandline;
    }

    if (dto.addressGuardian) {
      const a = dto.addressGuardian;
      if (a.permanentAddress) profileData.permanentAddress = a.permanentAddress;
      if (a.communicationAddress) profileData.communicationAddress = a.communicationAddress;
      if (a.emergencyContact) profileData.emergencyContact = a.emergencyContact;
      if (a.localGuardianName) profileData.localGuardianName = a.localGuardianName;
      if (a.localGuardianAddress) profileData.localGuardianAddress = a.localGuardianAddress;
      if (a.localGuardianMobile) profileData.localGuardianMobile = a.localGuardianMobile;
      if (a.localGuardianLandline) profileData.localGuardianLandline = a.localGuardianLandline;
      if (a.localGuardianEmail) profileData.localGuardianEmail = a.localGuardianEmail;
      if (a.medicalConditions) profileData.medicalConditions = a.medicalConditions;
    }

    if (dto.documents) {
      const d = dto.documents;
      if (d.passportNo) profileData.passportNo = d.passportNo;
      if (d.visaDetails) profileData.visaDetails = d.visaDetails;
      if (d.residentialPermit) profileData.residentialPermit = d.residentialPermit;
    }

    // Update registration-level fields
    const regData: Record<string, any> = {};
    if (dto.registration) {
      if (dto.registration.hostelId) regData.hostelId = dto.registration.hostelId;
      if (dto.registration.roomTypePreference) regData.roomTypePreference = dto.registration.roomTypePreference;
      if (dto.registration.messType) regData.messType = dto.registration.messType;
      if (dto.registration.previousHostelHistory) regData.previousHostelHistory = dto.registration.previousHostelHistory;
    }

    if (dto.declarations) {
      const d = dto.declarations;
      const now = new Date();
      if (d.hosteliteDeclarationAccepted) {
        regData.hosteliteDeclarationAccepted = true;
        regData.hosteliteDeclarationAt = now;
      }
      if (d.hosteliteDeclarationDocUrl !== undefined) {
        regData.hosteliteDeclarationDocUrl = d.hosteliteDeclarationDocUrl;
      }
      if (d.antiRaggingStudentAccepted) {
        regData.antiRaggingStudentAccepted = true;
        regData.antiRaggingStudentAt = now;
      }
      if (d.antiRaggingStudentDocUrl !== undefined) {
        regData.antiRaggingStudentDocUrl = d.antiRaggingStudentDocUrl;
      }
      if (d.antiRaggingParentAccepted) {
        regData.antiRaggingParentAccepted = true;
        regData.antiRaggingParentAt = now;
      }
      if (d.antiRaggingParentDocUrl !== undefined) {
        regData.antiRaggingParentDocUrl = d.antiRaggingParentDocUrl;
      }
      if (d.hostelAgreementAccepted) {
        regData.hostelAgreementAccepted = true;
        regData.hostelAgreementAt = now;
      }
      if (d.hostelAgreementDocUrl !== undefined) {
        regData.hostelAgreementDocUrl = d.hostelAgreementDocUrl;
      }
      if (d.raggingPreventionAccepted) {
        regData.raggingPreventionAccepted = true;
        regData.raggingPreventionAt = now;
      }
      if (d.raggingPreventionDocUrl !== undefined) {
        regData.raggingPreventionDocUrl = d.raggingPreventionDocUrl;
      }
    }

    // Transaction: update profile + registration
    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(profileData).length > 0) {
        await tx.studentProfile.upsert({
          where: { userId: studentId },
          update: profileData,
          create: { userId: studentId, ...profileData },
        });
      }

      if (Object.keys(regData).length > 0) {
        await tx.hostelRegistration.update({
          where: { id: registrationId },
          data: regData,
        });
      }
    });

    return this.findById(registrationId);
  }

  // =========================================================================
  // Student: Submit registration
  // =========================================================================

  async submitRegistration(
    registrationId: string,
    studentId: string,
    dto: SubmitRegistrationDto,
  ) {
    // First save all data
    await this.saveDraft(registrationId, studentId, dto);

    // Validate all declarations accepted
    if (
      !dto.declarations.hosteliteDeclarationAccepted ||
      !dto.declarations.antiRaggingStudentAccepted ||
      !dto.declarations.antiRaggingParentAccepted ||
      !dto.declarations.hostelAgreementAccepted ||
      !dto.declarations.raggingPreventionAccepted
    ) {
      throw new BadRequestException('All declarations must be accepted before submission');
    }

    // Capture snapshot of student profile at submission time
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            usn: true,
          },
        },
      },
    });

    await this.prisma.hostelRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.SUBMITTED,
        submittedAt: new Date(),
        studentSnapshot: profile ? JSON.parse(JSON.stringify(profile)) : null,
      },
    });

    this.logger.log(`Registration ${registrationId} submitted by student ${studentId}`);

    return this.findById(registrationId);
  }

  // =========================================================================
  // Admin: Review registration
  // =========================================================================

  async reviewRegistration(
    registrationId: string,
    reviewerId: string,
    dto: ReviewRegistrationDto,
  ) {
    const reg = await this.prisma.hostelRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) throw new NotFoundException('Registration not found');

    if (!['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'].includes(reg.status)) {
      throw new BadRequestException(
        `Cannot review a registration in ${reg.status} status`,
      );
    }

    const data: Record<string, any> = {
      status: dto.status as RegistrationStatus,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: dto.reviewNotes || null,
    };

    if (dto.status === 'REJECTED') {
      if (!dto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required');
      }
      data.rejectionReason = dto.rejectionReason;
    }

    await this.prisma.hostelRegistration.update({
      where: { id: registrationId },
      data,
    });

    this.logger.log(
      `Registration ${reg.applicationNo} reviewed: ${dto.status} by ${reviewerId}`,
    );

    return this.findById(registrationId);
  }

  // =========================================================================
  // Admin: Allot room/bed after approval
  // =========================================================================

  async allotRegistration(
    registrationId: string,
    assignedById: string,
    dto: AllotRegistrationDto,
  ) {
    const reg = await this.prisma.hostelRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.status !== 'APPROVED') {
      throw new BadRequestException('Only approved registrations can be allotted');
    }

    // Verify bed is vacant
    const bed = await this.prisma.bed.findUnique({
      where: { id: dto.bedId },
      include: { room: { include: { hostel: true } } },
    });
    if (!bed) throw new NotFoundException('Bed not found');
    if (bed.status !== BedStatus.VACANT) {
      throw new ConflictException(`Bed ${bed.bedNo} is not vacant`);
    }

    // Check student doesn't already have active assignment
    const activeAssignment = await this.prisma.bedAssignment.findFirst({
      where: { studentId: reg.studentId, status: AssignmentStatus.ACTIVE },
    });
    if (activeAssignment) {
      throw new ConflictException('Student already has an active bed assignment');
    }

    // Transaction: create bed assignment + update registration + update bed
    await this.prisma.$transaction(async (tx) => {
      // Create bed assignment
      await tx.bedAssignment.create({
        data: {
          studentId: reg.studentId,
          bedId: dto.bedId,
          status: AssignmentStatus.ACTIVE,
          assignedById,
          reason: `Hostel registration ${reg.applicationNo}`,
        },
      });

      // Mark bed occupied
      await tx.bed.update({
        where: { id: dto.bedId },
        data: { status: BedStatus.OCCUPIED, studentId: reg.studentId },
      });

      // Update registration
      await tx.hostelRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.ALLOTTED,
          hostelId: dto.hostelId,
          hostelIdNo: dto.hostelIdNo || null,
          messRollNo: dto.messRollNo || null,
          dateOfOccupation: new Date(),
          completedAt: new Date(),
        },
      });
    });

    this.logger.log(
      `Registration ${reg.applicationNo} allotted: bed ${bed.bedNo} in ${bed.room.hostel.code}`,
    );

    return this.findById(registrationId);
  }

  // =========================================================================
  // Admin: Record fee payment
  // =========================================================================

  async recordFee(userId: string, dto: RecordFeeDto) {
    const reg = await this.prisma.hostelRegistration.findUnique({
      where: { id: dto.registrationId },
    });
    if (!reg) throw new NotFoundException('Registration not found');

    const fee = await this.prisma.registrationFee.create({
      data: {
        registrationId: dto.registrationId,
        feeType: dto.feeType as FeeType,
        amount: dto.amount,
        receiptNo: dto.receiptNo || null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        recordedById: userId,
        notes: dto.notes || null,
      },
    });

    this.logger.log(
      `Fee ${dto.feeType} of ₹${dto.amount} recorded for ${reg.applicationNo}`,
    );

    return fee;
  }

  // =========================================================================
  // Student: Cancel registration
  // =========================================================================

  async cancelRegistration(registrationId: string, studentId: string) {
    const reg = await this.prisma.hostelRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.studentId !== studentId) throw new ForbiddenException('Not your registration');

    if (['ALLOTTED', 'CANCELLED', 'REJECTED'].includes(reg.status)) {
      throw new BadRequestException(`Cannot cancel a ${reg.status} registration`);
    }

    await this.prisma.hostelRegistration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED },
    });

    return this.findById(registrationId);
  }

  // =========================================================================
  // Queries
  // =========================================================================

  async findById(id: string) {
    const reg = await this.prisma.hostelRegistration.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            usn: true,
            status: true,
            studentProfile: true,
          },
        },
        hostel: {
          select: { id: true, code: true, name: true, type: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        fees: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!reg) throw new NotFoundException('Registration not found');
    return reg;
  }

  async findByApplicationNo(applicationNo: string) {
    const reg = await this.prisma.hostelRegistration.findUnique({
      where: { applicationNo },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            usn: true,
            status: true,
            studentProfile: true,
          },
        },
        hostel: {
          select: { id: true, code: true, name: true, type: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        fees: true,
      },
    });

    if (!reg) throw new NotFoundException('Registration not found');
    return reg;
  }

  async findMyRegistrations(studentId: string) {
    return this.prisma.hostelRegistration.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        hostel: {
          select: { id: true, code: true, name: true },
        },
        fees: true,
      },
    });
  }

  async findMany(query: ListRegistrationsQueryDto) {
    const { page = 1, limit = 20, status, academicYear, search, hostelId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.HostelRegistrationWhereInput = {};

    if (status) where.status = status as RegistrationStatus;
    if (academicYear) where.academicYear = academicYear;
    if (hostelId) where.hostelId = hostelId;

    if (search) {
      where.OR = [
        { applicationNo: { contains: search, mode: 'insensitive' } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { usn: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [registrations, total] = await Promise.all([
      this.prisma.hostelRegistration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          hostel: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      this.prisma.hostelRegistration.count({ where }),
    ]);

    return {
      data: registrations,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(academicYear?: string) {
    const where: Prisma.HostelRegistrationWhereInput = {};
    if (academicYear) where.academicYear = academicYear;

    const [total, draft, submitted, underReview, approved, allotted, rejected, cancelled, waitlisted] =
      await Promise.all([
        this.prisma.hostelRegistration.count({ where }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'DRAFT' } }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'SUBMITTED' } }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'UNDER_REVIEW' } }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'APPROVED' } }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'ALLOTTED' } }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'REJECTED' } }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'CANCELLED' } }),
        this.prisma.hostelRegistration.count({ where: { ...where, status: 'WAITLISTED' } }),
      ]);

    return {
      total,
      draft,
      submitted,
      underReview,
      approved,
      allotted,
      rejected,
      cancelled,
      waitlisted,
      pendingAction: submitted + underReview,
    };
  }
}
