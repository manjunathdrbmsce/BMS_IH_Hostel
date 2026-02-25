import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GateService } from './gate.service';
import { PrismaService } from '../prisma/prisma.service';
import { ViolationsService } from '../violations/violations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GateEntryType, GatePassStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrisma: any = {
  gateEntry: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  gatePass: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  bedAssignment: { findFirst: jest.fn() },
  leaveRequest: { findUnique: jest.fn() },
  $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

const mockViolationsService = {
  createPolicySnapshot: jest.fn(),
  detectLateEntry: jest.fn(),
  detectOverstay: jest.fn(),
  getRepeatedCount: jest.fn(),
  evaluateEscalation: jest.fn(),
  createViolation: jest.fn(),
};

const mockNotificationsService = {
  notifyParents: jest.fn(),
  notifyWardens: jest.fn(),
};

const mockEntry = {
  id: 'ge-1',
  studentId: 'u-1',
  type: GateEntryType.IN,
  gateNo: 'Gate-1',
  scannedById: 'u-guard',
  timestamp: new Date(),
  isLateEntry: false,
  lateMinutes: 0,
  linkedLeaveId: null,
  notes: null,
  student: { firstName: 'Arjun', lastName: 'Kumar', usn: '1BM22CS001' },
  scannedBy: { firstName: 'Guard', lastName: 'One' },
  linkedLeave: null,
  createdAt: new Date(),
};

const mockPass = {
  id: 'gp-1',
  studentId: 'u-1',
  purpose: 'Medical appointment',
  visitorName: null,
  visitorPhone: null,
  validFrom: new Date(),
  validTo: new Date(),
  status: GatePassStatus.ACTIVE,
  approvedById: 'u-admin',
  student: { firstName: 'Arjun', lastName: 'Kumar' },
  approvedBy: { firstName: 'Admin', lastName: 'User' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GateService', () => {
  let service: GateService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ViolationsService, useValue: mockViolationsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<GateService>(GateService);
  });

  // -----------------------------------------------------------------------
  // createEntry
  // -----------------------------------------------------------------------
  describe('createEntry', () => {
    it('should create a gate entry with policy snapshot', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', firstName: 'Arjun', lastName: 'Kumar' });
      mockPrisma.bedAssignment.findFirst.mockResolvedValue({
        bed: { room: { hostel: { name: 'Kuvempu', buildingId: 'bld-1' } } },
      });
      mockViolationsService.createPolicySnapshot.mockResolvedValue({
        id: 'snap-1',
        curfewTimeUsed: '22:00',
        toleranceMinUsed: 15,
        violationWindow: 30,
        repeatedThreshold: 3,
        notifyParentOnExit: false,
        notifyParentOnEntry: true,
        notifyParentOnLate: true,
        notifyWardenOnLate: true,
      });
      mockViolationsService.detectLateEntry.mockReturnValue(null);
      mockPrisma.gateEntry.create.mockResolvedValue(mockEntry);
      mockPrisma.gateEntry.findUnique.mockResolvedValue(mockEntry);
      mockNotificationsService.notifyParents.mockResolvedValue([]);

      const result = await service.createEntry({
        studentId: 'u-1', type: 'IN', gateNo: 'Gate-1',
      }, 'u-guard');
      expect(result.id).toBe('ge-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw if student not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createEntry({
        studentId: 'bad', type: 'IN', gateNo: 'Gate-1',
      }, 'u-guard')).rejects.toThrow(NotFoundException);
    });

    it('should detect late entry and create violation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', firstName: 'Arjun', lastName: 'Kumar' });
      mockPrisma.bedAssignment.findFirst.mockResolvedValue({
        bed: { room: { hostel: { name: 'Kuvempu', buildingId: 'bld-1' } } },
      });
      const snapshot = {
        id: 'snap-1',
        curfewTimeUsed: '22:00',
        toleranceMinUsed: 15,
        violationWindow: 30,
        repeatedThreshold: 3,
        notifyParentOnExit: false,
        notifyParentOnEntry: false,
        notifyParentOnLate: true,
        notifyWardenOnLate: true,
      };
      mockViolationsService.createPolicySnapshot.mockResolvedValue(snapshot);
      mockViolationsService.detectLateEntry.mockReturnValue({
        violatedByMinutes: 30,
        requestedTime: new Date(),
      });
      mockViolationsService.getRepeatedCount.mockResolvedValue(0);
      mockViolationsService.evaluateEscalation.mockReturnValue('NONE');
      mockViolationsService.createViolation.mockResolvedValue({
        id: 'viol-1',
        violatedByMinutes: 30,
        escalationState: 'NONE',
      });
      mockPrisma.gateEntry.create.mockResolvedValue({ ...mockEntry, isLateEntry: true, lateMinutes: 30 });
      mockPrisma.gateEntry.findUnique.mockResolvedValue({ ...mockEntry, isLateEntry: true });
      mockNotificationsService.notifyParents.mockResolvedValue([]);
      mockNotificationsService.notifyWardens.mockResolvedValue([]);

      const result = await service.createEntry({
        studentId: 'u-1', type: 'IN', gateNo: 'Gate-1',
      }, 'u-guard');
      expect(mockViolationsService.createViolation).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // findEntryById
  // -----------------------------------------------------------------------
  describe('findEntryById', () => {
    it('should return entry with relations', async () => {
      mockPrisma.gateEntry.findUnique.mockResolvedValue(mockEntry);
      const result = await service.findEntryById('ge-1');
      expect(result.id).toBe('ge-1');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.gateEntry.findUnique.mockResolvedValue(null);
      await expect(service.findEntryById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // createPass
  // -----------------------------------------------------------------------
  describe('createPass', () => {
    it('should create a gate pass', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrisma.gatePass.create.mockResolvedValue(mockPass);
      mockPrisma.gatePass.findUnique.mockResolvedValue(mockPass);

      const result = await service.createPass({
        studentId: 'u-1', purpose: 'Medical', validFrom: '2025-03-01T10:00:00Z', validTo: '2025-03-01T18:00:00Z',
      }, 'u-admin');
      expect(result.id).toBe('gp-1');
      expect(mockPrisma.gatePass.create).toHaveBeenCalled();
    });

    it('should throw if student not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createPass({
        studentId: 'bad', purpose: 'Test', validFrom: '2025-03-01T10:00:00Z', validTo: '2025-03-01T18:00:00Z',
      }, 'u-admin')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // findPassById
  // -----------------------------------------------------------------------
  describe('findPassById', () => {
    it('should return pass with relations', async () => {
      mockPrisma.gatePass.findUnique.mockResolvedValue(mockPass);
      const result = await service.findPassById('gp-1');
      expect(result.id).toBe('gp-1');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.gatePass.findUnique.mockResolvedValue(null);
      await expect(service.findPassById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // updatePass
  // -----------------------------------------------------------------------
  describe('updatePass', () => {
    it('should update gate pass status', async () => {
      mockPrisma.gatePass.findUnique
        .mockResolvedValueOnce(mockPass)
        .mockResolvedValueOnce({ ...mockPass, status: GatePassStatus.USED });
      mockPrisma.gatePass.update.mockResolvedValue({});

      const result = await service.updatePass('gp-1', { status: 'USED' });
      expect(mockPrisma.gatePass.update).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return gate stats', async () => {
      mockPrisma.gateEntry.count
        .mockResolvedValueOnce(25)  // today entries IN
        .mockResolvedValueOnce(20)  // today entries OUT
        .mockResolvedValueOnce(3)   // today late
        .mockResolvedValueOnce(15); // total late
      mockPrisma.gatePass.count
        .mockResolvedValueOnce(8)   // active passes
        .mockResolvedValueOnce(40); // used passes

      const result = await service.getStats();
      expect(result.todayEntries).toBe(25);
      expect(result.todayExits).toBe(20);
      expect(result.todayLateEntries).toBe(3);
      expect(result.totalLateEntries).toBe(15);
      expect(result.activePasses).toBe(8);
      expect(result.usedPasses).toBe(40);
    });
  });
});
