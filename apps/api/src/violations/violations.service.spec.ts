import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ViolationsService } from './violations.service';
import { PrismaService } from '../prisma/prisma.service';
import { EscalationState, ViolationType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrisma = {
  buildingPolicy: { findFirst: jest.fn() },
  policySnapshot: { create: jest.fn() },
  violation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
};

const mockPolicy = {
  id: 'pol-1',
  version: 2,
  weekdayCurfew: '22:00',
  weekendCurfew: '23:00',
  toleranceMin: 15,
  wardenEscalationMin: 30,
  repeatedViolationThreshold: 3,
  violationWindow: 30,
  notifyParentOnExit: true,
  notifyParentOnEntry: true,
  notifyParentOnLate: true,
  notifyWardenOnLate: true,
};

const mockSnapshot = {
  id: 'snap-1',
  buildingId: 'bld-1',
  policyId: 'pol-1',
  policyVersion: 2,
  curfewTimeUsed: '22:00',
  toleranceMinUsed: 15,
  escalationRuleMin: 30,
  repeatedThreshold: 3,
  violationWindow: 30,
};

const mockViolation = {
  id: 'viol-1',
  studentId: 'u-1',
  gateEntryId: 'ge-1',
  policySnapshotId: 'snap-1',
  type: ViolationType.LATE_ENTRY,
  requestedOrApprovedTime: new Date('2025-03-01T22:00:00Z'),
  actualTime: new Date('2025-03-01T22:45:00Z'),
  violatedByMinutes: 45,
  reason: 'Late entry: 45 minutes past curfew',
  repeatedCountSnapshot: 1,
  escalationState: EscalationState.NONE,
  notificationState: 'SENT',
  resolvedAt: null,
  resolvedById: null,
  resolvedNotes: null,
  student: { id: 'u-1', firstName: 'Arjun', lastName: 'Kumar', email: 'arjun@test.com', usn: '1BM22CS001' },
  gateEntry: { id: 'ge-1', type: 'IN', gateNo: 'Gate-1', timestamp: new Date() },
  policySnapshot: mockSnapshot,
  resolvedBy: null,
  notifications: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ViolationsService', () => {
  let service: ViolationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViolationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ViolationsService>(ViolationsService);
  });

  // -----------------------------------------------------------------------
  // createPolicySnapshot
  // -----------------------------------------------------------------------
  describe('createPolicySnapshot', () => {
    it('should create snapshot from active policy', async () => {
      mockPrisma.buildingPolicy.findFirst.mockResolvedValue(mockPolicy);
      mockPrisma.policySnapshot.create.mockResolvedValue(mockSnapshot);

      const result = await service.createPolicySnapshot('bld-1', null);
      expect(result).toEqual(mockSnapshot);
      expect(mockPrisma.buildingPolicy.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buildingId: 'bld-1', isActive: true },
        }),
      );
    });

    it('should return null if no active policy', async () => {
      mockPrisma.buildingPolicy.findFirst.mockResolvedValue(null);
      const result = await service.createPolicySnapshot('bld-1', null);
      expect(result).toBeNull();
    });

    it('should work with transaction client', async () => {
      const txClient = {
        buildingPolicy: { findFirst: jest.fn().mockResolvedValue(mockPolicy) },
        policySnapshot: { create: jest.fn().mockResolvedValue(mockSnapshot) },
      };

      const result = await service.createPolicySnapshot('bld-1', null, txClient as any);
      expect(result).toEqual(mockSnapshot);
      expect(txClient.buildingPolicy.findFirst).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // detectLateEntry
  // -----------------------------------------------------------------------
  describe('detectLateEntry', () => {
    it('should detect late entry past curfew + tolerance', () => {
      const timestamp = new Date('2025-03-01T22:45:00');
      const result = service.detectLateEntry(timestamp, '22:00', 15);
      expect(result).not.toBeNull();
      expect(result!.violatedByMinutes).toBe(45);
    });

    it('should return null when within tolerance', () => {
      const timestamp = new Date('2025-03-01T22:10:00');
      const result = service.detectLateEntry(timestamp, '22:00', 15);
      expect(result).toBeNull();
    });

    it('should return null when before curfew', () => {
      const timestamp = new Date('2025-03-01T21:30:00');
      const result = service.detectLateEntry(timestamp, '22:00', 15);
      expect(result).toBeNull();
    });

    it('should handle exact tolerance boundary as not late', () => {
      const timestamp = new Date('2025-03-01T22:15:00');
      const result = service.detectLateEntry(timestamp, '22:00', 15);
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // detectOverstay
  // -----------------------------------------------------------------------
  describe('detectOverstay', () => {
    it('should detect overstay past leave deadline + tolerance', () => {
      const leaveToDate = new Date('2025-03-01T10:00:00');
      const timestamp = new Date('2025-03-01T11:00:00');
      const result = service.detectOverstay(timestamp, leaveToDate, 15);
      expect(result).not.toBeNull();
      expect(result!.violatedByMinutes).toBe(60);
    });

    it('should return null when within tolerance', () => {
      const leaveToDate = new Date('2025-03-01T10:00:00');
      const timestamp = new Date('2025-03-01T10:10:00');
      const result = service.detectOverstay(timestamp, leaveToDate, 15);
      expect(result).toBeNull();
    });

    it('should return null when before deadline', () => {
      const leaveToDate = new Date('2025-03-01T10:00:00');
      const timestamp = new Date('2025-03-01T09:30:00');
      const result = service.detectOverstay(timestamp, leaveToDate, 15);
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // evaluateEscalation
  // -----------------------------------------------------------------------
  describe('evaluateEscalation', () => {
    it('should return ESCALATED when count >= threshold', () => {
      expect(service.evaluateEscalation(3, 3)).toBe('ESCALATED');
      expect(service.evaluateEscalation(5, 3)).toBe('ESCALATED');
    });

    it('should return WARNED when count >= half threshold', () => {
      expect(service.evaluateEscalation(2, 3)).toBe('WARNED');
      expect(service.evaluateEscalation(2, 4)).toBe('WARNED');
    });

    it('should return NONE when count < half threshold', () => {
      expect(service.evaluateEscalation(0, 3)).toBe('NONE');
      expect(service.evaluateEscalation(1, 4)).toBe('NONE');
    });
  });

  // -----------------------------------------------------------------------
  // getRepeatedCount
  // -----------------------------------------------------------------------
  describe('getRepeatedCount', () => {
    it('should count unresolved violations in window', async () => {
      mockPrisma.violation.count.mockResolvedValue(4);
      const result = await service.getRepeatedCount('u-1', 30);
      expect(result).toBe(4);
      expect(mockPrisma.violation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: 'u-1',
            escalationState: { not: 'RESOLVED' },
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // createViolation
  // -----------------------------------------------------------------------
  describe('createViolation', () => {
    it('should create a violation record', async () => {
      mockPrisma.violation.create.mockResolvedValue(mockViolation);

      const data = {
        studentId: 'u-1',
        gateEntryId: 'ge-1',
        policySnapshotId: 'snap-1',
        type: ViolationType.LATE_ENTRY,
        requestedOrApprovedTime: new Date(),
        actualTime: new Date(),
        violatedByMinutes: 45,
        reason: 'Late entry',
        repeatedCountSnapshot: 1,
        escalationState: EscalationState.NONE,
      };

      const result = await service.createViolation(data);
      expect(result.id).toBe('viol-1');
      expect(mockPrisma.violation.create).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return violation with relations', async () => {
      mockPrisma.violation.findUnique.mockResolvedValue(mockViolation);
      const result = await service.findById('viol-1');
      expect(result.id).toBe('viol-1');
      expect(result.student.firstName).toBe('Arjun');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.violation.findUnique.mockResolvedValue(null);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // findMany
  // -----------------------------------------------------------------------
  describe('findMany', () => {
    it('should return paginated violations', async () => {
      mockPrisma.violation.findMany.mockResolvedValue([mockViolation]);
      mockPrisma.violation.count.mockResolvedValue(1);

      const result = await service.findMany({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by type', async () => {
      mockPrisma.violation.findMany.mockResolvedValue([]);
      mockPrisma.violation.count.mockResolvedValue(0);

      await service.findMany({ type: 'LATE_ENTRY' });
      expect(mockPrisma.violation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'LATE_ENTRY' }),
        }),
      );
    });

    it('should filter by escalation state', async () => {
      mockPrisma.violation.findMany.mockResolvedValue([]);
      mockPrisma.violation.count.mockResolvedValue(0);

      await service.findMany({ escalationState: 'WARNED' });
      expect(mockPrisma.violation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ escalationState: 'WARNED' }),
        }),
      );
    });

    it('should support search', async () => {
      mockPrisma.violation.findMany.mockResolvedValue([]);
      mockPrisma.violation.count.mockResolvedValue(0);

      await service.findMany({ search: 'arjun' });
      expect(mockPrisma.violation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ student: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // resolve
  // -----------------------------------------------------------------------
  describe('resolve', () => {
    it('should resolve a violation', async () => {
      const resolvedViolation = {
        ...mockViolation,
        escalationState: EscalationState.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: 'u-warden',
        resolvedNotes: 'Warned verbally',
      };
      mockPrisma.violation.findUnique
        .mockResolvedValueOnce(mockViolation)
        .mockResolvedValueOnce(resolvedViolation);
      mockPrisma.violation.update.mockResolvedValue(resolvedViolation);

      const result = await service.resolve('viol-1', { notes: 'Warned verbally' }, 'u-warden');
      expect(result.escalationState).toBe(EscalationState.RESOLVED);
      expect(mockPrisma.violation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'viol-1' },
          data: expect.objectContaining({
            escalationState: 'RESOLVED',
            resolvedById: 'u-warden',
          }),
        }),
      );
    });

    it('should throw if violation not found', async () => {
      mockPrisma.violation.findUnique.mockResolvedValue(null);
      await expect(service.resolve('bad', {}, 'u-warden')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return stats object', async () => {
      mockPrisma.violation.count
        .mockResolvedValueOnce(5)    // todayViolations
        .mockResolvedValueOnce(12)   // weekViolations
        .mockResolvedValueOnce(3)    // openEscalations
        .mockResolvedValueOnce(7)    // resolvedThisWeek
        .mockResolvedValueOnce(50);  // totalViolations
      mockPrisma.violation.groupBy.mockResolvedValue([
        { type: 'LATE_ENTRY', _count: { id: 30 } },
        { type: 'OVERSTAY', _count: { id: 20 } },
      ]);

      const result = await service.getStats();
      expect(result.todayViolations).toBe(5);
      expect(result.weekViolations).toBe(12);
      expect(result.openEscalations).toBe(3);
      expect(result.resolvedThisWeek).toBe(7);
      expect(result.totalViolations).toBe(50);
      expect(result.byType).toHaveLength(2);
    });
  });
});
