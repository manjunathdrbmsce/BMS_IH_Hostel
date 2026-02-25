import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveType, LeaveStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrisma = {
  leaveRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  hostel: { findUnique: jest.fn() },
  buildingPolicy: { findFirst: jest.fn() },
};

const mockLeave = {
  id: 'lr-1',
  studentId: 'u-1',
  hostelId: 'h-1',
  type: LeaveType.HOME,
  fromDate: new Date('2025-03-01'),
  toDate: new Date('2025-03-03'),
  reason: 'Family function',
  status: LeaveStatus.PENDING,
  parentApprovalAt: null,
  wardenApprovalAt: null,
  rejectedAt: null,
  rejectionReason: null,
  wardenId: null,
  parentId: null,
  student: { firstName: 'Arjun', lastName: 'Kumar', usn: '1BM22CS001', email: 'arjun@student.bms.edu' },
  hostel: { name: 'Krishna Hostel' },
  warden: null,
  parent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LeaveService', () => {
  let service: LeaveService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<LeaveService>(LeaveService);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('should create a leave request', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrisma.hostel.findUnique.mockResolvedValue({ id: 'h-1', building: { id: 'b-1' } });
      mockPrisma.leaveRequest.findFirst.mockResolvedValue(null); // no overlapping
      mockPrisma.buildingPolicy.findFirst.mockResolvedValue({ maxLeaveDays: 30 });
      mockPrisma.leaveRequest.create.mockResolvedValue(mockLeave);
      mockPrisma.leaveRequest.findUnique.mockResolvedValue(mockLeave);

      const result = await service.create({
        studentId: 'u-1', hostelId: 'h-1', type: 'HOME',
        fromDate: '2025-03-01', toDate: '2025-03-03', reason: 'Family function',
      });
      expect(result.id).toBe('lr-1');
      expect(mockPrisma.leaveRequest.create).toHaveBeenCalled();
    });

    it('should throw if student not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.create({
        studentId: 'bad', hostelId: 'h-1', type: 'HOME',
        fromDate: '2025-03-01', toDate: '2025-03-03', reason: 'test',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw if toDate before fromDate', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrisma.hostel.findUnique.mockResolvedValue({ id: 'h-1', building: { id: 'b-1' } });
      await expect(service.create({
        studentId: 'u-1', hostelId: 'h-1', type: 'HOME',
        fromDate: '2025-03-05', toDate: '2025-03-01', reason: 'test',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return leave with relations', async () => {
      mockPrisma.leaveRequest.findUnique.mockResolvedValue(mockLeave);
      const result = await service.findById('lr-1');
      expect(result.id).toBe('lr-1');
      expect(result.student.firstName).toBe('Arjun');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.leaveRequest.findUnique.mockResolvedValue(null);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // parentApprove
  // -----------------------------------------------------------------------
  describe('parentApprove', () => {
    it('should update status to PARENT_APPROVED', async () => {
      mockPrisma.leaveRequest.findUnique
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.PENDING })
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.PARENT_APPROVED });
      mockPrisma.leaveRequest.update.mockResolvedValue({});
      const result = await service.parentApprove('lr-1', 'parent-1');
      expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: LeaveStatus.PARENT_APPROVED }) }),
      );
    });

    it('should throw if not PENDING', async () => {
      mockPrisma.leaveRequest.findUnique.mockResolvedValue({ ...mockLeave, status: LeaveStatus.WARDEN_APPROVED });
      await expect(service.parentApprove('lr-1', 'p-1')).rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // wardenApprove
  // -----------------------------------------------------------------------
  describe('wardenApprove', () => {
    it('should approve from PENDING or PARENT_APPROVED', async () => {
      mockPrisma.leaveRequest.findUnique
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.PARENT_APPROVED })
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.WARDEN_APPROVED });
      mockPrisma.leaveRequest.update.mockResolvedValue({});
      const result = await service.wardenApprove('lr-1', 'w-1');
      expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: LeaveStatus.WARDEN_APPROVED }) }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // reject
  // -----------------------------------------------------------------------
  describe('reject', () => {
    it('should reject a pending leave', async () => {
      mockPrisma.leaveRequest.findUnique
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.PENDING })
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.REJECTED });
      mockPrisma.leaveRequest.update.mockResolvedValue({});
      await service.reject('lr-1', 'w-1', 'Exam period');
      expect(mockPrisma.leaveRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: LeaveStatus.REJECTED, rejectionReason: 'Exam period' }) }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // cancel
  // -----------------------------------------------------------------------
  describe('cancel', () => {
    it('should cancel own leave request', async () => {
      mockPrisma.leaveRequest.findUnique
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.PENDING, studentId: 'u-1' })
        .mockResolvedValueOnce({ ...mockLeave, status: LeaveStatus.CANCELLED });
      mockPrisma.leaveRequest.update.mockResolvedValue({});
      await service.cancel('lr-1', 'u-1');
      expect(mockPrisma.leaveRequest.update).toHaveBeenCalled();
    });

    it('should throw if not the student', async () => {
      mockPrisma.leaveRequest.findUnique.mockResolvedValue({ ...mockLeave, studentId: 'u-1' });
      await expect(service.cancel('lr-1', 'other-user')).rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return counts per status', async () => {
      mockPrisma.leaveRequest.count
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(3)  // parent approved
        .mockResolvedValueOnce(10) // warden approved
        .mockResolvedValueOnce(2)  // rejected
        .mockResolvedValueOnce(1)  // cancelled
        .mockResolvedValueOnce(21); // total

      const result = await service.getStats();
      expect(result).toEqual({ pending: 5, parentApproved: 3, wardenApproved: 10, rejected: 2, cancelled: 1, total: 21 });
    });
  });
});
