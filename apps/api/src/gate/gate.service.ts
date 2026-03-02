import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, GateEntryType, GatePassStatus, ViolationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ViolationsService } from '../violations/violations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AttendanceService } from '../attendance/attendance.service';
import {
  CreateGateEntryDto,
  CreateGatePassDto,
  UpdateGatePassDto,
  ListGateEntriesQueryDto,
  ListGatePassesQueryDto,
} from './dto';

@Injectable()
export class GateService {
  private readonly logger = new Logger(GateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly violationsService: ViolationsService,
    private readonly notificationsService: NotificationsService,
    private readonly attendanceService: AttendanceService,
  ) { }

  // -----------------------------------------------------------------------
  // Gate Entries
  // -----------------------------------------------------------------------

  async createEntry(dto: CreateGateEntryDto, scannedById: string | null) {
    // Verify student
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Find student's hostel via active bed assignment
    const assignment = await this.prisma.bedAssignment.findFirst({
      where: { studentId: dto.studentId, status: 'ACTIVE' },
      include: { bed: { include: { room: { include: { hostel: true } } } } },
    });

    const buildingId = assignment?.bed?.room?.hostel?.buildingId || null;
    const hostelName = assignment?.bed?.room?.hostel?.name || 'Hostel';

    // Get linked leave if provided
    let leaveToDate: Date | null = null;
    if (dto.linkedLeaveId) {
      const leave = await this.prisma.leaveRequest.findUnique({
        where: { id: dto.linkedLeaveId },
      });
      if (leave) {
        leaveToDate = leave.toDate;
      }
    }

    // Perform all in a transaction: snapshot → entry → violation → notifications
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create policy snapshot (if building has a policy)
      let snapshot = null;
      if (buildingId) {
        snapshot = await this.violationsService.createPolicySnapshot(
          buildingId,
          leaveToDate,
          tx,
        );
      }

      // 2. Detect late entry / overstay
      let isLateEntry = false;
      let lateMinutes: number | null = null;
      let violationData: {
        type: ViolationType;
        violatedByMinutes: number;
        requestedTime: Date;
        reason: string;
      } | null = null;

      if (dto.type === 'IN' && snapshot) {
        // Check curfew violation
        const lateCheck = this.violationsService.detectLateEntry(
          new Date(),
          snapshot.curfewTimeUsed,
          snapshot.toleranceMinUsed,
        );

        if (lateCheck) {
          isLateEntry = true;
          lateMinutes = lateCheck.violatedByMinutes;
          violationData = {
            type: 'LATE_ENTRY' as ViolationType,
            violatedByMinutes: lateCheck.violatedByMinutes,
            requestedTime: lateCheck.requestedTime,
            reason: `Late entry: returned ${lateCheck.violatedByMinutes} minutes after curfew (${snapshot.curfewTimeUsed})`,
          };
        }

        // Check overstay (if linked to leave)
        if (!violationData && leaveToDate) {
          const overstayCheck = this.violationsService.detectOverstay(
            new Date(),
            leaveToDate,
            snapshot.toleranceMinUsed,
          );

          if (overstayCheck) {
            isLateEntry = true;
            lateMinutes = overstayCheck.violatedByMinutes;
            violationData = {
              type: 'OVERSTAY' as ViolationType,
              violatedByMinutes: overstayCheck.violatedByMinutes,
              requestedTime: overstayCheck.requestedTime,
              reason: `Overstay: returned ${overstayCheck.violatedByMinutes} minutes after approved leave end date`,
            };
          }
        }
      }

      // 3. Create gate entry
      const entry = await tx.gateEntry.create({
        data: {
          studentId: dto.studentId,
          type: dto.type as GateEntryType,
          gateNo: dto.gateNo.trim(),
          scannedById,
          isLateEntry,
          lateMinutes,
          linkedLeaveId: dto.linkedLeaveId || null,
          notes: dto.notes?.trim() || null,
          policySnapshotId: snapshot?.id || null,
        },
      });

      // 4. Create violation if detected
      let violation = null;
      if (violationData && snapshot) {
        const repeatedCount = await this.violationsService.getRepeatedCount(
          dto.studentId,
          snapshot.violationWindow,
          tx,
        );
        const escalationState = this.violationsService.evaluateEscalation(
          repeatedCount + 1, // include current violation
          snapshot.repeatedThreshold,
        );

        violation = await this.violationsService.createViolation(
          {
            studentId: dto.studentId,
            gateEntryId: entry.id,
            policySnapshotId: snapshot.id,
            type: violationData.type,
            requestedOrApprovedTime: violationData.requestedTime,
            actualTime: new Date(),
            violatedByMinutes: violationData.violatedByMinutes,
            reason: violationData.reason,
            repeatedCountSnapshot: repeatedCount + 1,
            escalationState,
          },
          tx,
        );
      }

      return { entry, snapshot, violation };
    });

    // 5. Send notifications (outside transaction, non-blocking)
    try {
      const studentName = `${student.firstName} ${student.lastName}`;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (dto.type === 'OUT' && result.snapshot?.notifyParentOnExit) {
        await this.notificationsService.notifyParents(
          dto.studentId,
          'Student Exit',
          `${studentName} left ${hostelName} at ${timeStr} via ${dto.gateNo}`,
          result.entry.id,
        );
      }

      if (dto.type === 'IN' && !result.violation && result.snapshot?.notifyParentOnEntry) {
        await this.notificationsService.notifyParents(
          dto.studentId,
          'Student Return',
          `${studentName} returned to ${hostelName} on time at ${timeStr}`,
          result.entry.id,
        );
      }

      if (result.violation) {
        if (result.snapshot?.notifyParentOnLate) {
          await this.notificationsService.notifyParents(
            dto.studentId,
            'Late Return Alert',
            `${studentName} returned to ${hostelName} at ${timeStr}, delayed by ${result.violation.violatedByMinutes} minutes past curfew (${result.snapshot.curfewTimeUsed})`,
            result.entry.id,
            result.violation.id,
          );
        }

        if (result.snapshot?.notifyWardenOnLate) {
          await this.notificationsService.notifyWardens(
            dto.studentId,
            'Late Entry Alert',
            `${studentName} entered late at ${timeStr} — ${result.violation.violatedByMinutes} min past curfew. Escalation: ${result.violation.escalationState}`,
            result.entry.id,
            result.violation.id,
          );
        }
      }
    } catch (err: any) {
      this.logger.warn(`Notification dispatch failed: ${err?.message}`);
    }

    // 6. Auto-update attendance from gate entry (non-blocking)
    try {
      await this.attendanceService.upsertFromGateEntry(
        dto.studentId,
        dto.type as 'IN' | 'OUT',
        new Date(),
      );
    } catch (err: any) {
      this.logger.warn(`Attendance auto-update from gate failed: ${err?.message}`);
    }

    return this.findEntryById(result.entry.id);
  }

  async findEntryById(id: string) {
    const entry = await this.prisma.gateEntry.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, usn: true },
        },
        scannedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        linkedLeave: {
          select: { id: true, type: true, fromDate: true, toDate: true, status: true },
        },
        policySnapshot: {
          select: {
            id: true,
            policyVersion: true,
            curfewTimeUsed: true,
            toleranceMinUsed: true,
            escalationRuleMin: true,
          },
        },
        violations: {
          select: {
            id: true,
            type: true,
            violatedByMinutes: true,
            escalationState: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Gate entry not found');
    }

    return entry;
  }

  async findEntries(query: ListGateEntriesQueryDto) {
    const { page = 1, limit = 20, studentId, type, lateOnly, fromDate, toDate, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GateEntryWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (type) where.type = type as GateEntryType;
    if (lateOnly) where.isLateEntry = true;

    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) where.timestamp.gte = new Date(fromDate);
      if (toDate) where.timestamp.lte = new Date(toDate);
    }

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { usn: { contains: search, mode: 'insensitive' } } },
        { gateNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.gateEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, usn: true },
          },
          scannedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.gateEntry.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // -----------------------------------------------------------------------
  // Gate Passes
  // -----------------------------------------------------------------------

  async createPass(dto: CreateGatePassDto, approvedById: string | null) {
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);
    if (validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }

    const pass = await this.prisma.gatePass.create({
      data: {
        studentId: dto.studentId,
        purpose: dto.purpose.trim(),
        visitorName: dto.visitorName?.trim() || null,
        visitorPhone: dto.visitorPhone?.trim() || null,
        validFrom,
        validTo,
        status: GatePassStatus.ACTIVE,
        approvedById,
      },
    });

    return this.findPassById(pass.id);
  }

  async findPassById(id: string) {
    const pass = await this.prisma.gatePass.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, usn: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!pass) {
      throw new NotFoundException('Gate pass not found');
    }

    return pass;
  }

  async findPasses(query: ListGatePassesQueryDto) {
    const { page = 1, limit = 20, studentId, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GatePassWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (status) where.status = status as GatePassStatus;

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        { student: { usn: { contains: search, mode: 'insensitive' } } },
        { purpose: { contains: search, mode: 'insensitive' } },
        { visitorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.gatePass.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, usn: true },
          },
          approvedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.gatePass.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updatePass(id: string, dto: UpdateGatePassDto) {
    await this.findPassById(id);

    const data: Prisma.GatePassUpdateInput = {};
    if (dto.status) data.status = dto.status as GatePassStatus;

    await this.prisma.gatePass.update({ where: { id }, data });

    return this.findPassById(id);
  }

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayIn, todayOut, todayLate, totalLate, activePasses, usedPasses] = await Promise.all([
      this.prisma.gateEntry.count({ where: { type: 'IN', timestamp: { gte: today, lt: tomorrow } } }),
      this.prisma.gateEntry.count({ where: { type: 'OUT', timestamp: { gte: today, lt: tomorrow } } }),
      this.prisma.gateEntry.count({ where: { isLateEntry: true, timestamp: { gte: today, lt: tomorrow } } }),
      this.prisma.gateEntry.count({ where: { isLateEntry: true } }),
      this.prisma.gatePass.count({ where: { status: 'ACTIVE' } }),
      this.prisma.gatePass.count({ where: { status: 'USED' } }),
    ]);

    return {
      todayEntries: todayIn,
      todayExits: todayOut,
      todayLateEntries: todayLate,
      totalLateEntries: totalLate,
      activePasses,
      usedPasses,
    };
  }
}
