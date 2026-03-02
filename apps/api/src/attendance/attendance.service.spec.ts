import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrisma: any = {
    hostel: { findUnique: jest.fn() },
    attendanceSession: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    bedAssignment: {
        count: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
    },
    dailyAttendance: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    studentDevice: { findFirst: jest.fn() },
    leaveRequest: { findFirst: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

const NOW = new Date('2025-06-15T10:00:00Z');

describe('AttendanceService', () => {
    let service: AttendanceService;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(NOW);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AttendanceService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<AttendanceService>(AttendanceService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // -----------------------------------------------------------------------
    // Test 1: Create session → verify rotating QR changes every 30s
    // -----------------------------------------------------------------------
    describe('createSession + getSessionQR', () => {
        it('should create a session and then return a rotating QR token', async () => {
            mockPrisma.hostel.findUnique.mockResolvedValue({ id: 'h-1', name: 'Krishna' });
            mockPrisma.attendanceSession.findFirst.mockResolvedValue(null);
            mockPrisma.bedAssignment.count.mockResolvedValue(50);
            mockPrisma.attendanceSession.create.mockResolvedValue({
                id: 'sess-1',
                hostelId: 'h-1',
                sessionSecret: 'a'.repeat(64),
                startsAt: NOW,
                expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
                status: 'ACTIVE',
                gpsLat: 12.97, gpsLng: 77.59, gpsRadiusM: 150,
                totalStudents: 50, presentCount: 0,
                hostel: { id: 'h-1', code: 'KR', name: 'Krishna' },
                createdBy: { id: 'w-1', firstName: 'Dr.', lastName: 'Patel' },
            });

            const session = await service.createSession(
                { hostelId: 'h-1', gpsLat: 12.97, gpsLng: 77.59 },
                'w-1',
            );
            expect(session.id).toBe('sess-1');
            expect(session.totalStudents).toBe(50);
        });

        it('should return a QR token that rotates (different time slot → different token)', async () => {
            const secret = 'a'.repeat(64);
            mockPrisma.attendanceSession.findUnique.mockResolvedValue({
                id: 'sess-1', sessionSecret: secret, status: 'ACTIVE',
                expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
                presentCount: 10, totalStudents: 50,
            });

            const qr1 = await service.getSessionQR('sess-1');
            expect(qr1.token).toHaveLength(16);
            expect(qr1.secondsRemaining).toBeLessThanOrEqual(30);
            expect(qr1.secondsRemaining).toBeGreaterThanOrEqual(0);

            // Advance 30 seconds → new time slot → different token
            jest.setSystemTime(new Date(NOW.getTime() + 31000));
            const qr2 = await service.getSessionQR('sess-1');
            expect(qr2.token).toHaveLength(16);
            expect(qr2.token).not.toBe(qr1.token); // Token rotated!
        });
    });

    // -----------------------------------------------------------------------
    // Test 2: Mark attendance with correct device + GPS → PRESENT
    // -----------------------------------------------------------------------
    describe('markAttendance', () => {
        const createValidSession = () => ({
            id: 'sess-1',
            sessionSecret: 'a'.repeat(64),
            status: 'ACTIVE',
            expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
            gpsLat: 12.9716, gpsLng: 77.5946, gpsRadiusM: 150,
            totalStudents: 50, presentCount: 5,
        });

        const getValidToken = () => {
            const { createHmac } = require('crypto');
            const timeSlot = Math.floor(NOW.getTime() / 30000);
            return createHmac('sha256', 'a'.repeat(64))
                .update(timeSlot.toString())
                .digest('hex')
                .substring(0, 16);
        };

        it('should mark PRESENT with valid device + GPS + token', async () => {
            const session = createValidSession();
            mockPrisma.attendanceSession.findUnique.mockResolvedValue(session);
            mockPrisma.studentDevice.findFirst.mockResolvedValue({
                id: 'dev-1', fingerprint: 'fp-valid', isActive: true,
            });
            mockPrisma.dailyAttendance.findUnique.mockResolvedValue(null);
            mockPrisma.dailyAttendance.upsert.mockResolvedValue({ id: 'att-1', status: 'PRESENT' });
            mockPrisma.attendanceSession.update.mockResolvedValue({});

            const result = await service.markAttendance({
                sessionId: 'sess-1',
                sessionToken: getValidToken(),
                deviceFingerprint: 'fp-valid',
                gpsLat: 12.9718,  // ~22m from session GPS
                gpsLng: 77.5948,
            }, 'student-1');

            expect(result.success).toBe(true);
        });

        // -----------------------------------------------------------------------
        // Test 3: Mark with wrong device → rejected
        // -----------------------------------------------------------------------
        it('should reject attendance with wrong device fingerprint', async () => {
            mockPrisma.attendanceSession.findUnique.mockResolvedValue(createValidSession());
            mockPrisma.studentDevice.findFirst.mockResolvedValue({
                id: 'dev-1', fingerprint: 'fp-legit', isActive: true,
            });

            await expect(service.markAttendance({
                sessionId: 'sess-1',
                sessionToken: getValidToken(),
                deviceFingerprint: 'fp-stolen-phone',
                gpsLat: 12.9718, gpsLng: 77.5948,
            }, 'student-1')).rejects.toThrow(BadRequestException);
        });

        // -----------------------------------------------------------------------
        // Test 4: Mark outside GPS radius → rejected
        // -----------------------------------------------------------------------
        it('should reject attendance outside GPS radius', async () => {
            mockPrisma.attendanceSession.findUnique.mockResolvedValue(createValidSession());
            mockPrisma.studentDevice.findFirst.mockResolvedValue({
                id: 'dev-1', fingerprint: 'fp-valid', isActive: true,
            });

            await expect(service.markAttendance({
                sessionId: 'sess-1',
                sessionToken: getValidToken(),
                deviceFingerprint: 'fp-valid',
                gpsLat: 13.05,    // ~9km away → rejected
                gpsLng: 77.6,
            }, 'student-1')).rejects.toThrow(BadRequestException);
        });

        // -----------------------------------------------------------------------
        // Test 5: Mark after session expires → rejected
        // -----------------------------------------------------------------------
        it('should reject attendance after session expires', async () => {
            const expiredSession = {
                ...createValidSession(),
                expiresAt: new Date(NOW.getTime() - 60000), // 1 min ago
            };
            mockPrisma.attendanceSession.findUnique.mockResolvedValue(expiredSession);
            mockPrisma.attendanceSession.update.mockResolvedValue({});

            await expect(service.markAttendance({
                sessionId: 'sess-1',
                sessionToken: getValidToken(),
                deviceFingerprint: 'fp-valid',
                gpsLat: 12.9718, gpsLng: 77.5948,
            }, 'student-1')).rejects.toThrow(BadRequestException);
        });

        // -----------------------------------------------------------------------
        // Test 6: Mark twice → already marked
        // -----------------------------------------------------------------------
        it('should reject duplicate attendance marking', async () => {
            mockPrisma.attendanceSession.findUnique.mockResolvedValue(createValidSession());
            mockPrisma.studentDevice.findFirst.mockResolvedValue({
                id: 'dev-1', fingerprint: 'fp-valid', isActive: true,
            });
            mockPrisma.dailyAttendance.findUnique.mockResolvedValue({
                id: 'att-1', sessionId: 'sess-1', status: 'PRESENT',
            });

            await expect(service.markAttendance({
                sessionId: 'sess-1',
                sessionToken: getValidToken(),
                deviceFingerprint: 'fp-valid',
                gpsLat: 12.9718, gpsLng: 77.5948,
            }, 'student-1')).rejects.toThrow(ConflictException);
        });
    });

    // -----------------------------------------------------------------------
    // Test 8: Gate IN/OUT → verify DailyAttendance auto-created
    // -----------------------------------------------------------------------
    describe('upsertFromGateEntry', () => {
        it('should auto-create DailyAttendance on gate IN', async () => {
            mockPrisma.dailyAttendance.upsert.mockResolvedValue({ id: 'att-1', status: 'PRESENT' });
            mockPrisma.bedAssignment.updateMany.mockResolvedValue({ count: 1 });

            await service.upsertFromGateEntry('student-1', 'IN', NOW);

            expect(mockPrisma.dailyAttendance.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({ status: 'PRESENT', source: 'GATE' }),
                }),
            );
            expect(mockPrisma.bedAssignment.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { presenceStatus: 'IN_HOSTEL' },
                }),
            );
        });

        it('should auto-create DailyAttendance on gate OUT and link leave if active', async () => {
            mockPrisma.leaveRequest.findFirst.mockResolvedValue({ id: 'leave-1' });
            mockPrisma.dailyAttendance.upsert.mockResolvedValue({ id: 'att-1', status: 'ON_LEAVE' });
            mockPrisma.bedAssignment.updateMany.mockResolvedValue({ count: 1 });

            await service.upsertFromGateEntry('student-1', 'OUT', NOW);

            expect(mockPrisma.dailyAttendance.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        status: 'ON_LEAVE',
                        isOnLeave: true,
                        leaveId: 'leave-1',
                    }),
                }),
            );
            expect(mockPrisma.bedAssignment.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { presenceStatus: 'ON_LEAVE' },
                }),
            );
        });
    });

    // -----------------------------------------------------------------------
    // Test 9: Leave approved → verify ON_LEAVE records for date range
    // -----------------------------------------------------------------------
    describe('markLeaveAttendance', () => {
        it('should bulk-create ON_LEAVE records for 3-day leave', async () => {
            mockPrisma.dailyAttendance.upsert.mockResolvedValue({});
            mockPrisma.bedAssignment.updateMany.mockResolvedValue({ count: 1 });

            await service.markLeaveAttendance(
                'student-1',
                new Date('2025-06-15'),
                new Date('2025-06-17'),
                'leave-1',
            );

            // Should create 3 records (15, 16, 17)
            expect(mockPrisma.dailyAttendance.upsert).toHaveBeenCalledTimes(3);
            expect(mockPrisma.dailyAttendance.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({
                        status: 'ON_LEAVE',
                        isOnLeave: true,
                        leaveId: 'leave-1',
                    }),
                }),
            );
            expect(mockPrisma.bedAssignment.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { presenceStatus: 'ON_LEAVE' },
                }),
            );
        });
    });
});
