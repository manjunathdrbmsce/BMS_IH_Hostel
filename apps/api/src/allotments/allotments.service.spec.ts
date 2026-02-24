import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AllotmentsService } from './allotments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentStatus, BedStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Transaction mock — must include all models accessed inside tx callback
// ---------------------------------------------------------------------------
const txMock = {
  user: {
    findUnique: jest.fn(),
  },
  bed: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  bedAssignment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockPrismaService = {
  $transaction: jest.fn((cb: (tx: typeof txMock) => Promise<any>) => cb(txMock)),
  bedAssignment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
};

const mockAssignment = {
  id: 'a-1',
  studentId: 'u-1',
  bedId: 'bed-1',
  status: AssignmentStatus.ACTIVE,
  assignedAt: new Date(),
  student: { id: 'u-1', firstName: 'Test', lastName: 'User', email: 'test@bms.local', usn: 'USN001' },
  bed: {
    id: 'bed-1',
    bedNo: 'A101-B1',
    room: { roomNo: 'A101', floor: 1, hostel: { id: 'h-1', code: 'KH', name: 'Krishna Hostel' } },
  },
  assignedBy: null,
};

describe('AllotmentsService', () => {
  let service: AllotmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllotmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AllotmentsService>(AllotmentsService);
  });

  // -----------------------------------------------------------------------
  // assign
  // -----------------------------------------------------------------------
  describe('assign', () => {
    it('should assign a bed transactionally', async () => {
      txMock.user.findUnique.mockResolvedValue({ id: 'u-1', firstName: 'Test', lastName: 'User' });
      txMock.bed.findUnique.mockResolvedValue({
        id: 'bed-1', bedNo: 'A101-B1', status: BedStatus.VACANT,
        room: { roomNo: 'A101', hostel: { code: 'KH' } },
      });
      txMock.bedAssignment.findFirst.mockResolvedValue(null); // no active assignment
      txMock.bedAssignment.create.mockResolvedValue({ id: 'a-1' });
      txMock.bed.update.mockResolvedValue({});
      // findById is called after create — uses non-tx prisma mock
      mockPrismaService.bedAssignment.findUnique.mockResolvedValue(mockAssignment);

      const result = await service.assign({ studentId: 'u-1', bedId: 'bed-1' } as any, 'admin-1');

      expect(result.id).toBe('a-1');
      expect(txMock.bed.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bed-1' },
          data: expect.objectContaining({ status: BedStatus.OCCUPIED }),
        }),
      );
    });

    it('should throw ConflictException when bed is occupied', async () => {
      txMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      txMock.bed.findUnique.mockResolvedValue({
        id: 'bed-1', bedNo: 'A101-B1', status: BedStatus.OCCUPIED,
        room: { roomNo: 'A101', hostel: { code: 'KH' } },
      });

      await expect(service.assign({ studentId: 'u-1', bedId: 'bed-1' } as any, 'admin-1'))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when student already has active assignment', async () => {
      txMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      txMock.bed.findUnique.mockResolvedValue({
        id: 'bed-1', bedNo: 'A101-B1', status: BedStatus.VACANT,
        room: { roomNo: 'A101', hostel: { code: 'KH' } },
      });
      txMock.bedAssignment.findFirst.mockResolvedValue({ id: 'existing-assignment' });

      await expect(service.assign({ studentId: 'u-1', bedId: 'bed-1' } as any, 'admin-1'))
        .rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // vacate
  // -----------------------------------------------------------------------
  describe('vacate', () => {
    it('should vacate bed and return success message', async () => {
      txMock.bedAssignment.findFirst.mockResolvedValue({
        id: 'a-1', studentId: 'u-1', bedId: 'bed-1', status: AssignmentStatus.ACTIVE,
        reason: null, notes: null,
        bed: { bedNo: 'A101-B1' },
      });
      txMock.bedAssignment.update.mockResolvedValue({});
      txMock.bed.update.mockResolvedValue({});

      const result = await service.vacate({ studentId: 'u-1', reason: 'Graduation' } as any, 'admin-1');

      expect(result.message).toContain('vacated');
    });

    it('should throw NotFoundException when no active assignment found', async () => {
      txMock.bedAssignment.findFirst.mockResolvedValue(null);

      await expect(service.vacate({ studentId: 'u-1' } as any, 'admin-1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // transfer
  // -----------------------------------------------------------------------
  describe('transfer', () => {
    it('should transfer student to new bed', async () => {
      txMock.bedAssignment.findFirst.mockResolvedValue({
        id: 'a-1', studentId: 'u-1', bedId: 'old-bed', status: AssignmentStatus.ACTIVE,
        bed: { bedNo: 'A101-B1' },
      });
      txMock.bed.findUnique.mockResolvedValue({
        id: 'new-bed', bedNo: 'A102-B1', status: BedStatus.VACANT,
        room: { roomNo: 'A102', hostel: { code: 'KH' } },
      });
      txMock.bedAssignment.update.mockResolvedValue({});
      txMock.bedAssignment.create.mockResolvedValue({ id: 'a-2' });
      txMock.bed.update.mockResolvedValue({});
      mockPrismaService.bedAssignment.findUnique.mockResolvedValue({
        ...mockAssignment, id: 'a-2', bedId: 'new-bed',
      });

      const result = await service.transfer(
        { studentId: 'u-1', newBedId: 'new-bed', reason: 'Room change' } as any,
        'admin-1',
      );

      expect(result.id).toBe('a-2');
    });

    it('should throw NotFoundException when student has no active assignment', async () => {
      txMock.bedAssignment.findFirst.mockResolvedValue(null);

      await expect(service.transfer({ studentId: 'u-1', newBedId: 'new-bed' } as any, 'admin-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new bed is not vacant', async () => {
      txMock.bedAssignment.findFirst.mockResolvedValue({
        id: 'a-1', studentId: 'u-1', bedId: 'old-bed', status: AssignmentStatus.ACTIVE,
        bed: { bedNo: 'A101-B1' },
      });
      txMock.bed.findUnique.mockResolvedValue({
        id: 'new-bed', bedNo: 'A102-B1', status: BedStatus.OCCUPIED,
        room: { roomNo: 'A102', hostel: { code: 'KH' } },
      });

      await expect(service.transfer({ studentId: 'u-1', newBedId: 'new-bed' } as any, 'admin-1'))
        .rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      mockPrismaService.bedAssignment.count
        .mockResolvedValueOnce(50)  // active
        .mockResolvedValueOnce(20)  // vacated
        .mockResolvedValueOnce(5);  // transferred

      const result = await service.getStats();

      expect(result.activeAssignments).toBe(50);
      expect(result.totalVacated).toBe(20);
      expect(result.totalTransferred).toBe(5);
      expect(result.totalHistory).toBe(75);
    });
  });
});
