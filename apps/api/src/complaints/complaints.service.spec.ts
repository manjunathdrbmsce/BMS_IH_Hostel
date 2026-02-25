import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { PrismaService } from '../prisma/prisma.service';
import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrisma = {
  complaint: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  complaintComment: { create: jest.fn() },
  user: { findUnique: jest.fn() },
  hostel: { findUnique: jest.fn() },
};

const mockComplaint = {
  id: 'c-1',
  studentId: 'u-1',
  hostelId: 'h-1',
  category: ComplaintCategory.MAINTENANCE,
  subject: 'Broken door lock',
  description: 'Door lock is jammed',
  priority: ComplaintPriority.MEDIUM,
  status: ComplaintStatus.OPEN,
  assignedToId: null,
  resolvedAt: null,
  resolution: null,
  student: { firstName: 'Arjun', lastName: 'Kumar' },
  hostel: { name: 'Krishna Hostel' },
  assignedTo: null,
  comments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ComplaintsService', () => {
  let service: ComplaintsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ComplaintsService>(ComplaintsService);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('should create a complaint', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrisma.hostel.findUnique.mockResolvedValue({ id: 'h-1' });
      mockPrisma.complaint.create.mockResolvedValue(mockComplaint);
      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);

      const result = await service.create({
        studentId: 'u-1', hostelId: 'h-1', category: 'MAINTENANCE',
        subject: 'Broken door lock', description: 'Door lock is jammed', priority: 'MEDIUM',
      });
      expect(result.id).toBe('c-1');
      expect(mockPrisma.complaint.create).toHaveBeenCalled();
    });

    it('should throw if student not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.create({
        studentId: 'bad', hostelId: 'h-1', category: 'MAINTENANCE',
        subject: 'test', description: 'test', priority: 'LOW',
      })).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return complaint with relations', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      const result = await service.findById('c-1');
      expect(result.id).toBe('c-1');
      expect(result.student.firstName).toBe('Arjun');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('should update complaint status', async () => {
      mockPrisma.complaint.findUnique
        .mockResolvedValueOnce(mockComplaint) // existence check
        .mockResolvedValueOnce({ ...mockComplaint, status: ComplaintStatus.IN_PROGRESS }); // return after update
      mockPrisma.complaint.update.mockResolvedValue({});

      const result = await service.update('c-1', { status: 'IN_PROGRESS' });
      expect(mockPrisma.complaint.update).toHaveBeenCalled();
    });

    it('should auto-set ASSIGNED when assignedToId provided on OPEN complaint', async () => {
      mockPrisma.complaint.findUnique
        .mockResolvedValueOnce({ ...mockComplaint, status: ComplaintStatus.OPEN })
        .mockResolvedValueOnce({ ...mockComplaint, status: ComplaintStatus.ASSIGNED });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.complaint.update.mockResolvedValue({});

      await service.update('c-1', { assignedToId: 'staff-1' });
      expect(mockPrisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: ComplaintStatus.ASSIGNED }) }),
      );
    });

    it('should set resolvedAt when status is RESOLVED', async () => {
      mockPrisma.complaint.findUnique
        .mockResolvedValueOnce({ ...mockComplaint, status: ComplaintStatus.IN_PROGRESS })
        .mockResolvedValueOnce({ ...mockComplaint, status: ComplaintStatus.RESOLVED });
      mockPrisma.complaint.update.mockResolvedValue({});

      await service.update('c-1', { status: 'RESOLVED', resolution: 'Fixed' });
      expect(mockPrisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ resolvedAt: expect.any(Date) }) }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // addComment
  // -----------------------------------------------------------------------
  describe('addComment', () => {
    it('should add a comment to complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.complaintComment.create.mockResolvedValue({ id: 'cc-1', message: 'Test comment' });

      const result = await service.addComment('c-1', 'u-1', 'Test comment');
      expect(mockPrisma.complaintComment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { complaintId: 'c-1', userId: 'u-1', message: 'Test comment' } }),
      );
    });

    it('should throw if complaint not found', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);
      await expect(service.addComment('bad', 'u-1', 'msg')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return status counts and category breakdown', async () => {
      mockPrisma.complaint.count
        .mockResolvedValueOnce(5)  // open
        .mockResolvedValueOnce(3)  // assigned
        .mockResolvedValueOnce(2)  // in progress
        .mockResolvedValueOnce(8)  // resolved
        .mockResolvedValueOnce(4)  // closed
        .mockResolvedValueOnce(1)  // reopened
        .mockResolvedValueOnce(23); // total
      mockPrisma.complaint.groupBy.mockResolvedValue([
        { category: 'MAINTENANCE', _count: { id: 10 } },
        { category: 'ELECTRICAL', _count: { id: 5 } },
      ]);

      const result = await service.getStats();
      expect(result.total).toBe(23);
      expect(result.open).toBe(5);
      expect(result.byCategory).toHaveLength(2);
    });
  });
});
