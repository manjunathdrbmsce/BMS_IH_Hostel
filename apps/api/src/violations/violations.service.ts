import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  ViolationType,
  EscalationState,
  NotificationState,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListViolationsQueryDto, ResolveViolationDto } from './dto';

@Injectable()
export class ViolationsService {
  private readonly logger = new Logger(ViolationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Policy Snapshot
  // -----------------------------------------------------------------------

  /**
   * Create a snapshot of the active policy for a building at this instant.
   */
  async createPolicySnapshot(
    buildingId: string,
    leaveDeadline: Date | null,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || this.prisma;
    const policy = await (db as any).buildingPolicy.findFirst({
      where: { buildingId, isActive: true },
      orderBy: { version: 'desc' as const },
    });

    if (!policy) return null;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const curfewTimeUsed = isWeekend ? policy.weekendCurfew : policy.weekdayCurfew;

    const snapshot = await (db as any).policySnapshot.create({
      data: {
        buildingId,
        policyId: policy.id,
        policyVersion: policy.version,
        curfewTimeUsed,
        toleranceMinUsed: policy.toleranceMin,
        leaveDeadlineUsed: leaveDeadline,
        escalationRuleMin: policy.wardenEscalationMin,
        repeatedThreshold: policy.repeatedViolationThreshold,
        violationWindow: policy.violationWindow,
        notifyParentOnExit: policy.notifyParentOnExit,
        notifyParentOnEntry: policy.notifyParentOnEntry,
        notifyParentOnLate: policy.notifyParentOnLate,
        notifyWardenOnLate: policy.notifyWardenOnLate,
        snapshotData: JSON.parse(JSON.stringify(policy)),
      },
    });

    return snapshot;
  }

  // -----------------------------------------------------------------------
  // Violation Detection
  // -----------------------------------------------------------------------

  /**
   * Detect late-entry violation. Returns violation data if late, null otherwise.
   */
  detectLateEntry(
    timestamp: Date,
    curfewTime: string,
    toleranceMin: number,
  ): { violatedByMinutes: number; requestedTime: Date } | null {
    const [curfewHour, curfewMinute] = curfewTime.split(':').map(Number);
    const curfewDate = new Date(timestamp);
    curfewDate.setHours(curfewHour, curfewMinute, 0, 0);

    const deadlineDate = new Date(
      curfewDate.getTime() + toleranceMin * 60 * 1000,
    );

    if (timestamp > deadlineDate) {
      const violatedByMinutes = Math.ceil(
        (timestamp.getTime() - curfewDate.getTime()) / (1000 * 60),
      );
      return { violatedByMinutes, requestedTime: curfewDate };
    }

    return null;
  }

  /**
   * Detect overstay violation. Returns violation data if overstay, null otherwise.
   */
  detectOverstay(
    timestamp: Date,
    leaveToDate: Date,
    toleranceMin: number,
  ): { violatedByMinutes: number; requestedTime: Date } | null {
    const deadline = new Date(
      leaveToDate.getTime() + toleranceMin * 60 * 1000,
    );

    if (timestamp > deadline) {
      const violatedByMinutes = Math.ceil(
        (timestamp.getTime() - leaveToDate.getTime()) / (1000 * 60),
      );
      return { violatedByMinutes, requestedTime: leaveToDate };
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Repeated Count & Escalation
  // -----------------------------------------------------------------------

  async getRepeatedCount(
    studentId: string,
    violationWindowDays: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx || this.prisma;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - violationWindowDays);

    return (db as any).violation.count({
      where: {
        studentId,
        createdAt: { gte: windowStart },
        escalationState: { not: 'RESOLVED' as EscalationState },
      },
    });
  }

  evaluateEscalation(
    repeatedCount: number,
    threshold: number,
  ): EscalationState {
    if (repeatedCount >= threshold) return 'ESCALATED';
    if (repeatedCount >= Math.ceil(threshold / 2)) return 'WARNED';
    return 'NONE';
  }

  // -----------------------------------------------------------------------
  // Create Violation Record
  // -----------------------------------------------------------------------

  async createViolation(
    data: {
      studentId: string;
      gateEntryId: string;
      policySnapshotId: string;
      type: ViolationType;
      requestedOrApprovedTime: Date;
      actualTime: Date;
      violatedByMinutes: number;
      reason: string;
      repeatedCountSnapshot: number;
      escalationState: EscalationState;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx || this.prisma;
    const violation = await (db as any).violation.create({
      data: {
        studentId: data.studentId,
        gateEntryId: data.gateEntryId,
        policySnapshotId: data.policySnapshotId,
        type: data.type,
        requestedOrApprovedTime: data.requestedOrApprovedTime,
        actualTime: data.actualTime,
        violatedByMinutes: data.violatedByMinutes,
        reason: data.reason,
        repeatedCountSnapshot: data.repeatedCountSnapshot,
        escalationState: data.escalationState,
        notificationState: 'PENDING' as NotificationState,
      },
    });

    this.logger.log(
      `Violation created: ${data.type} for student ${data.studentId}, ${data.violatedByMinutes} min late, escalation=${data.escalationState}`,
    );

    return violation;
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  async findById(id: string) {
    const violation = await this.prisma.violation.findUnique({
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
        gateEntry: {
          select: {
            id: true,
            type: true,
            gateNo: true,
            timestamp: true,
          },
        },
        policySnapshot: true,
        resolvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        notifications: {
          select: {
            id: true,
            channel: true,
            title: true,
            state: true,
            createdAt: true,
          },
        },
      },
    });

    if (!violation) {
      throw new NotFoundException('Violation not found');
    }

    return violation;
  }

  async findMany(query: ListViolationsQueryDto) {
    const {
      page = 1,
      limit = 20,
      studentId,
      type,
      escalationState,
      fromDate,
      toDate,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ViolationWhereInput = {};

    if (studentId) where.studentId = studentId;
    if (type) where.type = type as ViolationType;
    if (escalationState)
      where.escalationState = escalationState as EscalationState;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    if (search) {
      where.OR = [
        {
          student: {
            firstName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          student: {
            lastName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          student: { usn: { contains: search, mode: 'insensitive' } },
        },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.violation.findMany({
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
          gateEntry: {
            select: { id: true, type: true, gateNo: true, timestamp: true },
          },
          policySnapshot: {
            select: {
              id: true,
              policyVersion: true,
              curfewTimeUsed: true,
              toleranceMinUsed: true,
            },
          },
        },
      }),
      this.prisma.violation.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStudentViolations(studentId: string, query: ListViolationsQueryDto) {
    return this.findMany({ ...query, studentId });
  }

  async resolve(id: string, dto: ResolveViolationDto, resolvedById: string) {
    await this.findById(id);

    await this.prisma.violation.update({
      where: { id },
      data: {
        escalationState: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById,
        resolvedNotes: dto.notes?.trim() || null,
      },
    });

    return this.findById(id);
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      todayViolations,
      weekViolations,
      openEscalations,
      resolvedThisWeek,
      totalViolations,
      byType,
    ] = await Promise.all([
      this.prisma.violation.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      this.prisma.violation.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      this.prisma.violation.count({
        where: { escalationState: { in: ['WARNED', 'ESCALATED'] } },
      }),
      this.prisma.violation.count({
        where: {
          escalationState: 'RESOLVED',
          resolvedAt: { gte: weekAgo },
        },
      }),
      this.prisma.violation.count(),
      this.prisma.violation.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
    ]);

    return {
      todayViolations,
      weekViolations,
      openEscalations,
      resolvedThisWeek,
      totalViolations,
      byType: byType.map((b) => ({ type: b.type, count: b._count.id })),
    };
  }
}
