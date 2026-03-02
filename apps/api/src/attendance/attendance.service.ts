import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import {
    Prisma,
    AttendanceStatus,
    AttendanceSource,
    SessionStatus,
    PresenceStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac, randomBytes } from 'crypto';
import { CreateSessionDto, MarkAttendanceDto, ListAttendanceQueryDto, StudentAttendanceQueryDto } from './dto';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(private readonly prisma: PrismaService) { }

    // =========================================================================
    // Session Management
    // =========================================================================

    /**
     * Warden starts a roll-call session.
     * Creates a session with a random secret, GPS anchor, and TTL.
     */
    async createSession(dto: CreateSessionDto, createdById: string) {
        // Verify hostel exists
        const hostel = await this.prisma.hostel.findUnique({
            where: { id: dto.hostelId },
        });
        if (!hostel) {
            throw new NotFoundException('Hostel not found');
        }

        // Check no active session already running for this hostel
        const existingActive = await this.prisma.attendanceSession.findFirst({
            where: {
                hostelId: dto.hostelId,
                status: 'ACTIVE',
                expiresAt: { gt: new Date() },
            },
        });
        if (existingActive) {
            throw new ConflictException(
                'An active session is already running for this hostel. Wait for it to expire or cancel it first.',
            );
        }

        // Count total students assigned to this hostel
        const totalStudents = await this.prisma.bedAssignment.count({
            where: {
                status: 'ACTIVE',
                bed: { room: { hostelId: dto.hostelId } },
            },
        });

        const sessionSecret = randomBytes(32).toString('hex'); // 64 char hex
        const durationMin = dto.durationMin || 5;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000);

        const session = await this.prisma.attendanceSession.create({
            data: {
                hostelId: dto.hostelId,
                createdById,
                sessionSecret,
                title: dto.title?.trim() || `Roll-Call ${now.toLocaleDateString('en-IN')}`,
                startsAt: now,
                expiresAt,
                status: SessionStatus.ACTIVE,
                gpsLat: dto.gpsLat,
                gpsLng: dto.gpsLng,
                gpsRadiusM: dto.gpsRadiusM || 150,
                totalStudents,
                presentCount: 0,
            },
            include: {
                hostel: { select: { id: true, code: true, name: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        this.logger.log(
            `Attendance session ${session.id} started for hostel ${hostel.name} by ${createdById}, expires at ${expiresAt.toISOString()}`,
        );

        return session;
    }

    /**
     * Get the current rotating QR token for a session.
     * Token rotates every 30 seconds using HMAC(secret, timeSlot).
     */
    async getSessionQR(sessionId: string) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            throw new NotFoundException('Session not found');
        }

        // Auto-expire check
        if (session.status === 'ACTIVE' && new Date() > session.expiresAt) {
            await this.expireSession(sessionId);
            throw new BadRequestException('Session has expired');
        }

        if (session.status !== 'ACTIVE') {
            throw new BadRequestException(`Session is ${session.status.toLowerCase()}`);
        }

        const timeSlot = Math.floor(Date.now() / 30000); // 30 second windows
        const token = createHmac('sha256', session.sessionSecret)
            .update(timeSlot.toString())
            .digest('hex')
            .substring(0, 16); // 16 char token for QR

        const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);

        return {
            sessionId: session.id,
            token,
            secondsRemaining,
            expiresAt: session.expiresAt,
            presentCount: session.presentCount,
            totalStudents: session.totalStudents,
        };
    }

    /**
     * Get live session stats (present count, total, etc.).
     */
    async getSessionLive(sessionId: string) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: {
                hostel: { select: { id: true, code: true, name: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                attendance: {
                    where: { status: 'PRESENT' },
                    include: {
                        student: {
                            select: { id: true, firstName: true, lastName: true, usn: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return {
            ...session,
            absentCount: session.totalStudents - session.presentCount,
            isExpired: session.status !== 'ACTIVE' || new Date() > session.expiresAt,
        };
    }

    // =========================================================================
    // Mark Attendance (Student Action)
    // =========================================================================

    /**
     * Student marks attendance via QR scan.
     * 4-layer validation: session active, token valid, device bound, GPS within radius.
     */
    async markAttendance(dto: MarkAttendanceDto, studentId: string) {
        // 1. Session validation
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: dto.sessionId },
        });
        if (!session) {
            throw new NotFoundException('Attendance session not found');
        }
        if (session.status !== 'ACTIVE') {
            throw new BadRequestException('Session is no longer active');
        }
        if (new Date() > session.expiresAt) {
            await this.expireSession(session.id);
            throw new BadRequestException('Session has expired');
        }

        // 2. Validate rotating token
        const timeSlot = Math.floor(Date.now() / 30000);
        const expectedToken = createHmac('sha256', session.sessionSecret)
            .update(timeSlot.toString())
            .digest('hex')
            .substring(0, 16);

        // Also accept previous time slot (grace window)
        const prevToken = createHmac('sha256', session.sessionSecret)
            .update((timeSlot - 1).toString())
            .digest('hex')
            .substring(0, 16);

        if (dto.sessionToken !== expectedToken && dto.sessionToken !== prevToken) {
            throw new BadRequestException(
                'Invalid or expired QR code. Please scan the latest QR code.',
            );
        }

        // 3. Device validation
        const activeDevice = await this.prisma.studentDevice.findFirst({
            where: { userId: studentId, isActive: true },
        });
        if (!activeDevice) {
            throw new BadRequestException(
                'No registered device found. Please register your device first.',
            );
        }
        if (activeDevice.fingerprint !== dto.deviceFingerprint) {
            throw new BadRequestException(
                'Device mismatch. Attendance can only be marked from your registered device. If you changed devices, request a device change from your warden.',
            );
        }

        // 4. GPS validation
        const distance = this.haversineDistance(
            dto.gpsLat,
            dto.gpsLng,
            session.gpsLat,
            session.gpsLng,
        );
        if (distance > session.gpsRadiusM) {
            throw new BadRequestException(
                `You are ${Math.round(distance)}m away from the session location. Maximum allowed: ${session.gpsRadiusM}m. Please move closer to the hostel.`,
            );
        }

        // 5. Check not already marked for this session
        const today = this.getDateOnly(new Date());
        const existing = await this.prisma.dailyAttendance.findUnique({
            where: { studentId_date: { studentId, date: today } },
        });
        if (existing && existing.sessionId === session.id) {
            throw new ConflictException('You have already marked attendance for this session');
        }

        // 6. All checks passed — mark present (transaction)
        const result = await this.prisma.$transaction(async (tx) => {
            const attendance = await tx.dailyAttendance.upsert({
                where: { studentId_date: { studentId, date: today } },
                create: {
                    studentId,
                    date: today,
                    status: AttendanceStatus.PRESENT,
                    firstIn: new Date(),
                    lastIn: new Date(),
                    sessionId: session.id,
                    source: AttendanceSource.QR_SCAN,
                    gpsLat: dto.gpsLat,
                    gpsLng: dto.gpsLng,
                    deviceId: activeDevice.id,
                },
                update: {
                    status: AttendanceStatus.PRESENT,
                    lastIn: new Date(),
                    sessionId: session.id,
                    source: AttendanceSource.QR_SCAN,
                    gpsLat: dto.gpsLat,
                    gpsLng: dto.gpsLng,
                    deviceId: activeDevice.id,
                },
            });

            // Increment session present count
            await tx.attendanceSession.update({
                where: { id: session.id },
                data: { presentCount: { increment: 1 } },
            });

            return attendance;
        });

        this.logger.log(
            `Attendance marked: student ${studentId} → session ${session.id} (QR_SCAN)`,
        );

        return { success: true, data: result };
    }

    // =========================================================================
    // Gate Integration
    // =========================================================================

    /**
     * Auto-create/update DailyAttendance from gate IN/OUT events.
     * Called by GateService after creating a gate entry.
     */
    async upsertFromGateEntry(
        studentId: string,
        type: 'IN' | 'OUT',
        timestamp: Date,
    ) {
        const today = this.getDateOnly(timestamp);
        const now = timestamp;

        try {
            if (type === 'IN') {
                // Gate IN → student is present
                await this.prisma.dailyAttendance.upsert({
                    where: { studentId_date: { studentId, date: today } },
                    create: {
                        studentId,
                        date: today,
                        status: AttendanceStatus.PRESENT,
                        firstIn: now,
                        lastIn: now,
                        source: AttendanceSource.GATE,
                    },
                    update: {
                        status: AttendanceStatus.PRESENT,
                        lastIn: now,
                    },
                });

                // Update presence status
                await this.prisma.bedAssignment.updateMany({
                    where: { studentId, status: 'ACTIVE' },
                    data: { presenceStatus: PresenceStatus.IN_HOSTEL },
                });
            } else {
                // Gate OUT → update lastOut
                // Gap 5: Detect active approved leave and link it
                const activeLeave = await this.prisma.leaveRequest.findFirst({
                    where: {
                        studentId,
                        status: 'WARDEN_APPROVED',
                        fromDate: { lte: today },
                        toDate: { gte: today },
                    },
                    select: { id: true },
                });

                await this.prisma.dailyAttendance.upsert({
                    where: { studentId_date: { studentId, date: today } },
                    create: {
                        studentId,
                        date: today,
                        status: activeLeave ? AttendanceStatus.ON_LEAVE : AttendanceStatus.PRESENT,
                        lastOut: now,
                        source: AttendanceSource.GATE,
                        isOnLeave: !!activeLeave,
                        leaveId: activeLeave?.id || null,
                    },
                    update: {
                        lastOut: now,
                        ...(activeLeave ? {
                            status: AttendanceStatus.ON_LEAVE,
                            isOnLeave: true,
                            leaveId: activeLeave.id,
                        } : {}),
                    },
                });

                // Update presence status
                await this.prisma.bedAssignment.updateMany({
                    where: { studentId, status: 'ACTIVE' },
                    data: {
                        presenceStatus: activeLeave
                            ? PresenceStatus.ON_LEAVE
                            : PresenceStatus.OUT_CAMPUS,
                    },
                });
            }

            this.logger.debug(
                `Attendance auto-updated from gate ${type}: student ${studentId}`,
            );
        } catch (err: any) {
            this.logger.warn(
                `Failed to upsert attendance from gate entry: ${err?.message}`,
            );
        }
    }

    // =========================================================================
    // Leave Integration
    // =========================================================================

    /**
     * Bulk-create ON_LEAVE attendance records for an approved leave date range.
     * Called by LeaveService after warden approval.
     */
    async markLeaveAttendance(
        studentId: string,
        fromDate: Date,
        toDate: Date,
        leaveId: string,
    ) {
        const dates: Date[] = [];
        const current = new Date(fromDate);
        const end = new Date(toDate);

        while (current <= end) {
            dates.push(this.getDateOnly(new Date(current)));
            current.setDate(current.getDate() + 1);
        }

        try {
            for (const date of dates) {
                await this.prisma.dailyAttendance.upsert({
                    where: { studentId_date: { studentId, date } },
                    create: {
                        studentId,
                        date,
                        status: AttendanceStatus.ON_LEAVE,
                        isOnLeave: true,
                        leaveId,
                        source: AttendanceSource.SYSTEM,
                    },
                    update: {
                        status: AttendanceStatus.ON_LEAVE,
                        isOnLeave: true,
                        leaveId,
                        source: AttendanceSource.SYSTEM,
                    },
                });
            }

            // Update presence status
            await this.prisma.bedAssignment.updateMany({
                where: { studentId, status: 'ACTIVE' },
                data: { presenceStatus: PresenceStatus.ON_LEAVE },
            });

            this.logger.log(
                `Leave attendance marked: student ${studentId}, ${dates.length} days (${fromDate.toISOString().split('T')[0]} → ${toDate.toISOString().split('T')[0]})`,
            );
        } catch (err: any) {
            this.logger.error(
                `Failed to mark leave attendance: ${err?.message}`,
            );
        }
    }

    // =========================================================================
    // Reporting / Queries
    // =========================================================================

    /**
     * Get daily attendance records with filters.
     */
    async getDailyAttendance(query: ListAttendanceQueryDto) {
        const { page = 1, limit = 20, date, hostelId, status, search } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.DailyAttendanceWhereInput = {};

        if (date) {
            where.date = this.getDateOnly(new Date(date));
        }

        if (status) {
            where.status = status as AttendanceStatus;
        }

        if (hostelId) {
            where.student = {
                bedAssignments: {
                    some: {
                        status: 'ACTIVE',
                        bed: { room: { hostelId } },
                    },
                },
            };
        }

        if (search) {
            where.student = {
                ...where.student as any,
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { usn: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const [data, total] = await Promise.all([
            this.prisma.dailyAttendance.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                include: {
                    student: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            usn: true,
                            bedAssignments: {
                                where: { status: 'ACTIVE' },
                                take: 1,
                                include: {
                                    bed: { include: { room: { select: { roomNo: true, hostel: { select: { name: true } } } } } },
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.dailyAttendance.count({ where }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    /**
     * Get a student's attendance history with calendar data.
     */
    async getStudentAttendance(
        studentId: string,
        query: StudentAttendanceQueryDto,
    ) {
        const now = new Date();
        const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = query.to ? new Date(query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const records = await this.prisma.dailyAttendance.findMany({
            where: {
                studentId,
                date: { gte: this.getDateOnly(from), lte: this.getDateOnly(to) },
            },
            orderBy: { date: 'asc' },
        });

        // Calculate statistics
        const presentDays = records.filter((r) => r.status === 'PRESENT').length;
        const absentDays = records.filter((r) => r.status === 'ABSENT').length;
        const leaveDays = records.filter((r) => r.status === 'ON_LEAVE').length;
        const lateDays = records.filter((r) => r.status === 'LATE').length;
        const totalRecords = records.length;
        const workingDays = presentDays + absentDays + lateDays; // Exclude leave from percentage calc
        const attendancePercentage = workingDays > 0
            ? Math.round((presentDays + lateDays) / workingDays * 100)
            : 0;

        return {
            studentId,
            from: from.toISOString().split('T')[0],
            to: to.toISOString().split('T')[0],
            records,
            stats: {
                present: presentDays,
                absent: absentDays,
                onLeave: leaveDays,
                late: lateDays,
                total: totalRecords,
                attendancePercentage,
                isBelow75: attendancePercentage < 75,
            },
        };
    }

    /**
     * Real-time presence board — counts by status.
     */
    async getPresenceBoard(hostelId?: string) {
        const baseWhere: Prisma.BedAssignmentWhereInput = {
            status: 'ACTIVE',
            ...(hostelId ? { bed: { room: { hostelId } } } : {}),
        };

        const [inHostel, outCampus, onLeave, total] = await Promise.all([
            this.prisma.bedAssignment.count({
                where: { ...baseWhere, presenceStatus: 'IN_HOSTEL' },
            }),
            this.prisma.bedAssignment.count({
                where: { ...baseWhere, presenceStatus: 'OUT_CAMPUS' },
            }),
            this.prisma.bedAssignment.count({
                where: { ...baseWhere, presenceStatus: 'ON_LEAVE' },
            }),
            this.prisma.bedAssignment.count({ where: baseWhere }),
        ]);

        return {
            inHostel,
            outCampus,
            onLeave,
            total,
            hostelId: hostelId || 'all',
        };
    }

    /**
     * Get hostel summary for a specific date.
     */
    async getHostelSummary(hostelId: string, date?: string) {
        const targetDate = date ? this.getDateOnly(new Date(date)) : this.getDateOnly(new Date());

        const studentIds = await this.prisma.bedAssignment.findMany({
            where: {
                status: 'ACTIVE',
                bed: { room: { hostelId } },
            },
            select: { studentId: true },
        });

        const ids = studentIds.map((s) => s.studentId);

        const [present, absent, onLeave, late, unknown] = await Promise.all([
            this.prisma.dailyAttendance.count({
                where: { studentId: { in: ids }, date: targetDate, status: 'PRESENT' },
            }),
            this.prisma.dailyAttendance.count({
                where: { studentId: { in: ids }, date: targetDate, status: 'ABSENT' },
            }),
            this.prisma.dailyAttendance.count({
                where: { studentId: { in: ids }, date: targetDate, status: 'ON_LEAVE' },
            }),
            this.prisma.dailyAttendance.count({
                where: { studentId: { in: ids }, date: targetDate, status: 'LATE' },
            }),
            this.prisma.dailyAttendance.count({
                where: { studentId: { in: ids }, date: targetDate, status: 'UNKNOWN' },
            }),
        ]);

        const total = ids.length;
        const notMarked = total - (present + absent + onLeave + late + unknown);

        return {
            hostelId,
            date: targetDate.toISOString().split('T')[0],
            totalStudents: total,
            present,
            absent,
            onLeave,
            late,
            unknown,
            notMarked,
            attendancePercentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
        };
    }

    // =========================================================================
    // Active Sessions Query (for student manual-entry dropdown)
    // =========================================================================

    /**
     * Returns all currently active sessions with human-readable names.
     * Used by the student UI to select a session without entering a raw UUID.
     */
    async getActiveSessions() {
        return this.prisma.attendanceSession.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                title: true,
                expiresAt: true,
                hostel: { select: { id: true, name: true, code: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { startsAt: 'desc' },
        });
    }

    // =========================================================================
    // Session Lifecycle
    // =========================================================================

    /**
     * Expire a session and mark unmarked students as ABSENT.
     */
    async expireSession(sessionId: string) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
        });
        if (!session || session.status !== 'ACTIVE') return;

        await this.prisma.attendanceSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.EXPIRED },
        });

        this.logger.log(`Session ${sessionId} expired`);
    }

    /**
     * Cancel a session (warden action).
     */
    async cancelSession(sessionId: string, userId: string) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            throw new NotFoundException('Session not found');
        }
        if (session.status !== 'ACTIVE') {
            throw new BadRequestException('Only active sessions can be cancelled');
        }

        await this.prisma.attendanceSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.CANCELLED },
        });

        this.logger.log(`Session ${sessionId} cancelled by ${userId}`);

        return { success: true, message: 'Session cancelled' };
    }

    // =========================================================================
    // Utility Functions
    // =========================================================================

    /**
     * Haversine formula — distance between two GPS coordinates in meters.
     */
    private haversineDistance(
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number,
    ): number {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return (deg * Math.PI) / 180;
    }

    /**
     * Strip time from a Date to get just the date portion.
     */
    private getDateOnly(date: Date): Date {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    }
}
