import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, LeaveStatus, LeaveType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CreateLeaveRequestDto, ListLeaveQueryDto } from './dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationsService: NotificationsService,
    private readonly attendanceService: AttendanceService,
  ) { }

  /**
   * Enterprise eligibility check — validates all prerequisites before
   * a student can apply for leave. Returns structured data for the frontend.
   */
  async checkEligibility(studentId: string) {
    // 1. Verify student exists
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, email: true, usn: true },
    });
    if (!student) {
      return { eligible: false, reason: 'Student not found', student: null, hostel: null, guardians: [] };
    }

    // 2. Check active hostel assignment (via bed → room → hostel)
    const activeAssignment = await this.prisma.bedAssignment.findFirst({
      where: { studentId, status: 'ACTIVE' },
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
    });

    const hostel = activeAssignment?.bed?.room?.hostel || null;
    if (!hostel) {
      return {
        eligible: false,
        reason: 'No active hostel assignment. Please contact the hostel office to get assigned to a room before applying for leave.',
        student: { id: student.id, name: `${student.firstName} ${student.lastName}`, usn: student.usn },
        hostel: null,
        guardians: [],
        assignment: null,
      };
    }

    // 3. Check guardian links
    const guardianLinks = await this.prisma.guardianLink.findMany({
      where: { studentId },
      include: {
        guardian: { select: { id: true, firstName: true, lastName: true, mobile: true } },
      },
    });

    const guardians = guardianLinks.map((gl) => ({
      id: gl.guardian.id,
      name: `${gl.guardian.firstName} ${gl.guardian.lastName}`,
      mobile: gl.guardian.mobile,
      relation: gl.relation,
      hasWhatsApp: !!gl.guardian.mobile,
    }));

    // 4. Check for existing overlapping active leave
    const activeLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        studentId,
        status: { in: ['PENDING', 'PARENT_APPROVED'] },
      },
      select: { id: true, status: true, fromDate: true, toDate: true },
    });

    // 5. Room/bed info
    const roomInfo = activeAssignment?.bed?.room;
    const bedInfo = activeAssignment?.bed;

    return {
      eligible: true,
      reason: null,
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        usn: student.usn,
      },
      hostel: {
        id: hostel.id,
        name: hostel.name,
        code: hostel.code,
      },
      room: roomInfo ? {
        id: roomInfo.id,
        number: roomInfo.roomNo,
        floor: roomInfo.floor,
      } : null,
      bed: bedInfo ? {
        id: bedInfo.id,
        number: bedInfo.bedNo,
      } : null,
      guardians,
      hasGuardian: guardians.length > 0,
      guardiansWithWhatsApp: guardians.filter((g) => g.hasWhatsApp).length,
      activeLeave: activeLeave || null,
      warnings: [
        ...(!guardians.length ? ['No guardian linked — WhatsApp approval will not work. Contact hostel office.'] : []),
        ...(guardians.length > 0 && !guardians.some((g) => g.hasWhatsApp) ? ['No guardian has a mobile number — WhatsApp notification will fail.'] : []),
        ...(activeLeave ? [`You already have an active leave request (${activeLeave.status}). It must be resolved before applying for a new one.`] : []),
      ],
    };
  }

  async create(dto: CreateLeaveRequestDto) {
    // Verify student exists and has active hostel assignment
    const eligibility = await this.checkEligibility(dto.studentId);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    const student = eligibility.student!;
    const hostel = eligibility.hostel!;

    // Override hostelId with the student's actual assigned hostel
    const hostelId = hostel.id;

    // Fetch full hostel for policy check
    const hostelFull = await this.prisma.hostel.findUnique({
      where: { id: hostelId },
      select: { id: true, code: true, name: true, buildingId: true },
    });
    if (!hostelFull) {
      throw new NotFoundException('Hostel not found');
    }

    // Validate date range
    const from = new Date(dto.fromDate);
    const to = new Date(dto.toDate);
    if (to <= from) {
      throw new BadRequestException('toDate must be after fromDate');
    }

    // Check for overlapping active leave
    if (eligibility.activeLeave) {
      throw new ConflictException('Student already has an active leave request. It must be resolved before applying for a new one.');
    }

    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        studentId: dto.studentId,
        status: { in: ['PENDING', 'PARENT_APPROVED', 'WARDEN_APPROVED'] },
        fromDate: { lte: to },
        toDate: { gte: from },
      },
    });
    if (overlapping) {
      throw new ConflictException('Student already has an overlapping leave request for these dates');
    }

    if (hostelFull.buildingId) {
      const policy = await this.prisma.buildingPolicy.findFirst({
        where: { buildingId: hostelFull.buildingId, isActive: true },
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
        hostelId: hostelId,
        type: dto.type as LeaveType,
        fromDate: from,
        toDate: to,
        reason: dto.reason.trim(),
        proofUrl: dto.proofUrl || null,
        status: LeaveStatus.PENDING,
      },
    });

    // ── Auto-notify parent(s) via WhatsApp ──────────────────────────
    this.sendParentWhatsAppNotification(
      dto.studentId,
      { firstName: student.name.split(' ')[0], lastName: student.name.split(' ').slice(1).join(' ') },
      hostelFull,
      leave,
    ).catch((err) => {
      this.logger.error(`Failed to send WhatsApp to parent: ${err.message}`);
    });

    return this.findById(leave.id);
  }

  /**
   * Send WhatsApp notification to all linked parents/guardians.
   */
  private async sendParentWhatsAppNotification(
    studentId: string,
    student: { firstName: string; lastName: string },
    hostel: { name: string },
    leave: { id: string; type: string; fromDate: Date; toDate: Date; reason: string },
  ) {
    // Find parent(s) via GuardianLink
    const guardianLinks = await this.prisma.guardianLink.findMany({
      where: { studentId },
      include: {
        guardian: {
          select: { id: true, mobile: true, firstName: true, lastName: true },
        },
      },
    });

    if (guardianLinks.length === 0) {
      this.logger.warn(`No guardian linked to student ${studentId} — skipping WhatsApp`);
      return;
    }

    const studentName = `${student.firstName} ${student.lastName}`;
    const fromDateStr = leave.fromDate.toISOString().split('T')[0];
    const toDateStr = leave.toDate.toISOString().split('T')[0];

    for (const link of guardianLinks) {
      const parent = link.guardian;
      if (!parent.mobile) {
        this.logger.warn(`Parent ${parent.id} has no mobile — skipping WhatsApp`);
        continue;
      }

      // Ensure phone number has country code
      const phoneNumber = parent.mobile.startsWith('+')
        ? parent.mobile
        : `+91${parent.mobile}`;

      try {
        await this.whatsAppService.sendLeaveApprovalRequest(phoneNumber, {
          studentName,
          leaveType: leave.type,
          fromDate: fromDateStr,
          toDate: toDateStr,
          reason: leave.reason,
          hostelName: hostel.name,
        });

        // Also create an IN_APP notification for the parent
        await this.notificationsService.createNotification({
          recipientId: parent.id,
          channel: 'WHATSAPP',
          title: 'Leave Approval Required',
          message: `Your ward ${studentName} has applied for ${leave.type} leave from ${fromDateStr} to ${toDateStr}. Reason: ${leave.reason}`,
          leaveRequestId: leave.id,
        });

        this.logger.log(`WhatsApp leave notification sent to parent ${parent.id} (${phoneNumber})`);
      } catch (err: any) {
        this.logger.error(`WhatsApp send failed for parent ${parent.id}: ${err.message}`);
      }
    }
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

  /**
   * Parent rejects a leave request.
   */
  async parentReject(id: string, parentId: string) {
    const leave = await this.findById(id);

    if (leave.status !== 'PENDING') {
      throw new ConflictException('Leave request is not in PENDING status');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.PARENT_REJECTED,
        parentId,
      },
    });

    return this.findById(id);
  }

  /**
   * Warden approves a leave request.
   * IMPORTANT: Warden can ONLY approve after parent has approved.
   */
  async wardenApprove(id: string, wardenId: string) {
    const leave = await this.findById(id);

    // Strict enforcement: parent must approve first
    if (leave.status !== 'PARENT_APPROVED') {
      if (leave.status === 'PENDING') {
        throw new ConflictException(
          'Parent approval is required before warden can approve. The leave request is still awaiting parent approval.',
        );
      }
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

    // Phase 7: Auto-mark attendance as ON_LEAVE for leave date range
    try {
      await this.attendanceService.markLeaveAttendance(
        leave.studentId,
        leave.fromDate,
        leave.toDate,
        id,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to mark leave attendance: ${err?.message}`);
    }

    // Gap 4: Auto-create GatePass for the leave date range
    try {
      await this.prisma.gatePass.create({
        data: {
          studentId: leave.studentId,
          purpose: `Approved leave: ${leave.reason || leave.type}`,
          validFrom: leave.fromDate,
          validTo: leave.toDate,
          status: 'ACTIVE',
          approvedById: wardenId,
        },
      });
      this.logger.log(`Auto-created GatePass for leave ${id}`);
    } catch (err: any) {
      this.logger.warn(`Failed to auto-create GatePass: ${err?.message}`);
    }

    return this.findById(id);
  }

  async reject(id: string, wardenId: string, rejectionReason: string) {
    const leave = await this.findById(id);

    if (['REJECTED', 'CANCELLED', 'WARDEN_APPROVED', 'PARENT_REJECTED'].includes(leave.status)) {
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

    if (['CANCELLED', 'REJECTED', 'PARENT_REJECTED'].includes(leave.status)) {
      throw new ConflictException('Leave request is already cancelled/rejected');
    }

    await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
    });

    return this.findById(id);
  }

  async getStats() {
    const [pending, parentApproved, parentRejected, wardenApproved, rejected, cancelled] =
      await Promise.all([
        this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.leaveRequest.count({ where: { status: 'PARENT_APPROVED' } }),
        this.prisma.leaveRequest.count({ where: { status: 'PARENT_REJECTED' } }),
        this.prisma.leaveRequest.count({ where: { status: 'WARDEN_APPROVED' } }),
        this.prisma.leaveRequest.count({ where: { status: 'REJECTED' } }),
        this.prisma.leaveRequest.count({ where: { status: 'CANCELLED' } }),
      ]);

    return {
      pending,
      parentApproved,
      parentRejected,
      wardenApproved,
      rejected,
      cancelled,
      total: pending + parentApproved + parentRejected + wardenApproved + rejected + cancelled,
    };
  }
}
