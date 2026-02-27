import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrationStatus, BedStatus, AssignmentStatus } from '@prisma/client';

// ─── Transaction mock ────────────────────────────────────────────────────
const txMock = {
  studentProfile: { upsert: jest.fn() },
  hostelRegistration: { update: jest.fn() },
  bedAssignment: { create: jest.fn(), findFirst: jest.fn() },
  bed: { update: jest.fn() },
};

const mockPrismaService = {
  $transaction: jest.fn((cb: (tx: typeof txMock) => Promise<any>) => cb(txMock)),
  hostelRegistration: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  studentProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  registrationFee: { create: jest.fn() },
  bed: { findUnique: jest.fn() },
  bedAssignment: { findFirst: jest.fn() },
};

// ─── Fixtures ────────────────────────────────────────────────────────────
const mockReg = {
  id: 'reg-1',
  applicationNo: 'IH-2025-0001',
  studentId: 'student-1',
  academicYear: '2025-2026',
  hostelId: 'hostel-1',
  status: RegistrationStatus.DRAFT,
  createdAt: new Date(),
  student: {
    id: 'student-1',
    firstName: 'Raj',
    lastName: 'Kumar',
    email: 'raj@bms.local',
    usn: '1BM22CS001',
    status: 'ACTIVE',
    studentProfile: {},
  },
  hostel: { id: 'hostel-1', code: 'KH', name: 'Krishna Hostel', type: 'BOYS' },
  reviewedBy: null,
  fees: [],
};

describe('RegistrationService', () => {
  let service: RegistrationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
  });

  // ─── startRegistration ─────────────────────────────────────────────────
  describe('startRegistration', () => {
    it('should create a new draft registration', async () => {
      mockPrismaService.hostelRegistration.findFirst.mockResolvedValueOnce(null); // no existing
      mockPrismaService.hostelRegistration.findFirst.mockResolvedValueOnce(null); // for app no generation
      mockPrismaService.hostelRegistration.create.mockResolvedValue({ id: 'reg-1' });
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(mockReg);

      const result = await service.startRegistration('student-1', {
        academicYear: '2025-2026',
      });

      expect(result.id).toBe('reg-1');
      expect(mockPrismaService.hostelRegistration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: 'student-1',
            academicYear: '2025-2026',
            status: RegistrationStatus.DRAFT,
          }),
        }),
      );
    });

    it('should throw ConflictException if active registration exists', async () => {
      mockPrismaService.hostelRegistration.findFirst.mockResolvedValue({
        applicationNo: 'IH-2025-0001',
      });

      await expect(
        service.startRegistration('student-1', { academicYear: '2025-2026' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── saveDraft ─────────────────────────────────────────────────────────
  describe('saveDraft', () => {
    it('should save draft data', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(mockReg);

      const result = await service.saveDraft('reg-1', 'student-1', {
        personalDetails: { dateOfBirth: '2003-05-15', gender: 'Male', bloodGroup: 'O+' },
      } as any);

      expect(txMock.studentProfile.upsert).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for another student', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(mockReg);

      await expect(
        service.saveDraft('reg-1', 'other-student', {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if not a draft', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue({
        ...mockReg,
        status: RegistrationStatus.SUBMITTED,
      });

      await expect(
        service.saveDraft('reg-1', 'student-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── submitRegistration ────────────────────────────────────────────────
  describe('submitRegistration', () => {
    const fullDto = {
      personalDetails: { dateOfBirth: '2003-05-15', gender: 'Male', bloodGroup: 'O+' },
      academicDetails: { department: 'CSE', course: 'B.E.', year: '3', semester: '5' },
      familyDetails: { fatherName: 'Ravi', motherName: 'Lakshmi', fatherOccupation: 'Engineer', fatherMobile: '9876543210' },
      addressGuardian: { permanentAddress: 'Bangalore', emergencyContact: '9876543210', localGuardianName: 'Suresh', localGuardianAddress: 'Bangalore', localGuardianMobile: '9876543211' },
      documents: {},
      declarations: {
        hosteliteDeclarationAccepted: true,
        antiRaggingStudentAccepted: true,
        antiRaggingParentAccepted: true,
        hostelAgreementAccepted: true,
        raggingPreventionAccepted: true,
      },
    } as any;

    it('should throw BadRequestException if declarations not accepted', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(mockReg);

      await expect(
        service.submitRegistration('reg-1', 'student-1', {
          ...fullDto,
          declarations: { ...fullDto.declarations, hosteliteDeclarationAccepted: false },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── reviewRegistration ────────────────────────────────────────────────
  describe('reviewRegistration', () => {
    it('should approve a submitted registration', async () => {
      mockPrismaService.hostelRegistration.findUnique
        .mockResolvedValueOnce({ ...mockReg, status: RegistrationStatus.SUBMITTED })
        .mockResolvedValueOnce({ ...mockReg, status: RegistrationStatus.APPROVED });
      mockPrismaService.hostelRegistration.update.mockResolvedValue({});

      const result = await service.reviewRegistration('reg-1', 'admin-1', {
        status: 'APPROVED',
        reviewNotes: 'All good',
      } as any);

      expect(mockPrismaService.hostelRegistration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            reviewedById: 'admin-1',
          }),
        }),
      );
    });

    it('should require rejection reason when rejecting', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue({
        ...mockReg,
        status: RegistrationStatus.SUBMITTED,
      });

      await expect(
        service.reviewRegistration('reg-1', 'admin-1', {
          status: 'REJECTED',
          reviewNotes: '',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing registration', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewRegistration('nonexist', 'admin-1', { status: 'APPROVED' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue({
        ...mockReg,
        status: RegistrationStatus.DRAFT,
      });

      await expect(
        service.reviewRegistration('reg-1', 'admin-1', { status: 'APPROVED' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── cancelRegistration ────────────────────────────────────────────────
  describe('cancelRegistration', () => {
    it('should cancel a draft registration', async () => {
      mockPrismaService.hostelRegistration.findUnique
        .mockResolvedValueOnce({ ...mockReg, status: RegistrationStatus.DRAFT })
        .mockResolvedValueOnce({ ...mockReg, status: RegistrationStatus.CANCELLED });
      mockPrismaService.hostelRegistration.update.mockResolvedValue({});

      const result = await service.cancelRegistration('reg-1', 'student-1');
      expect(result.status).toBe(RegistrationStatus.CANCELLED);
    });

    it('should throw ForbiddenException for another student', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(mockReg);

      await expect(
        service.cancelRegistration('reg-1', 'other-student'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not allow cancelling an allotted registration', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue({
        ...mockReg,
        status: RegistrationStatus.ALLOTTED,
      });

      await expect(
        service.cancelRegistration('reg-1', 'student-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────
  describe('findById', () => {
    it('should return registration with relations', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(mockReg);

      const result = await service.findById('reg-1');
      expect(result.applicationNo).toBe('IH-2025-0001');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexist')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findMany ──────────────────────────────────────────────────────────
  describe('findMany', () => {
    it('should return paginated results', async () => {
      mockPrismaService.hostelRegistration.findMany.mockResolvedValue([mockReg]);
      mockPrismaService.hostelRegistration.count.mockResolvedValue(1);

      const result = await service.findMany({ page: 1, limit: 20 } as any);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply status filter', async () => {
      mockPrismaService.hostelRegistration.findMany.mockResolvedValue([]);
      mockPrismaService.hostelRegistration.count.mockResolvedValue(0);

      await service.findMany({ page: 1, limit: 20, status: 'SUBMITTED' } as any);
      expect(mockPrismaService.hostelRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SUBMITTED' }),
        }),
      );
    });
  });

  // ─── getStats ──────────────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return counts by status', async () => {
      mockPrismaService.hostelRegistration.count.mockResolvedValue(5);

      const result = await service.getStats('2025-2026');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('pendingAction');
    });
  });

  // ─── recordFee ─────────────────────────────────────────────────────────
  describe('recordFee', () => {
    it('should record a fee payment', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(mockReg);
      mockPrismaService.registrationFee.create.mockResolvedValue({
        id: 'fee-1',
        feeType: 'HOSTEL_FEE',
        amount: 50000,
      });

      const result = await service.recordFee('admin-1', {
        registrationId: 'reg-1',
        feeType: 'HOSTEL_FEE',
        amount: 50000,
        receiptNo: 'HR-0001',
      } as any);

      expect(result.amount).toBe(50000);
    });

    it('should throw NotFoundException for invalid registration', async () => {
      mockPrismaService.hostelRegistration.findUnique.mockResolvedValue(null);

      await expect(
        service.recordFee('admin-1', { registrationId: 'nonexist', feeType: 'HOSTEL_FEE', amount: 50000 } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
