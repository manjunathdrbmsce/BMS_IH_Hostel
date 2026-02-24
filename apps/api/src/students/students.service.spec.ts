import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  studentProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  guardianLink: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  bedAssignment: {
    findFirst: jest.fn(),
  },
};

const mockProfile = {
  id: 'sp-1',
  userId: 'u-1',
  department: 'Computer Science',
  year: 2,
  user: { id: 'u-1', firstName: 'Test', lastName: 'User', email: 'test@bms.local', mobile: null, usn: '1BM22CS001', status: 'ACTIVE' },
};

describe('StudentsService', () => {
  let service: StudentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  // -----------------------------------------------------------------------
  // createProfile
  // -----------------------------------------------------------------------
  describe('createProfile', () => {
    it('should create a student profile and return enriched result', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u-1', firstName: 'Test' });
      mockPrismaService.studentProfile.findUnique
        .mockResolvedValueOnce(null)       // duplicate check
        .mockResolvedValueOnce(mockProfile); // findProfileByUserId after create
      mockPrismaService.studentProfile.create.mockResolvedValue({ id: 'sp-1' });
      mockPrismaService.guardianLink.findMany.mockResolvedValue([]);
      mockPrismaService.bedAssignment.findFirst.mockResolvedValue(null);

      const result = await service.createProfile({ userId: 'u-1', department: 'CS', year: 2 } as any);

      expect(result.id).toBe('sp-1');
      expect(mockPrismaService.studentProfile.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createProfile({ userId: 'nonexistent' } as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when profile already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u-1' });
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({ id: 'sp-existing' });

      await expect(service.createProfile({ userId: 'u-1' } as any))
        .rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // findProfileByUserId
  // -----------------------------------------------------------------------
  describe('findProfileByUserId', () => {
    it('should return enriched profile', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.guardianLink.findMany.mockResolvedValue([]);
      mockPrismaService.bedAssignment.findFirst.mockResolvedValue(null);

      const result = await service.findProfileByUserId('u-1');

      expect(result.id).toBe('sp-1');
      expect(result.guardians).toEqual([]);
      expect(result.currentAssignment).toBeNull();
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);

      await expect(service.findProfileByUserId('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // findMany
  // -----------------------------------------------------------------------
  describe('findMany', () => {
    it('should return paginated student list', async () => {
      mockPrismaService.studentProfile.findMany.mockResolvedValue([mockProfile]);
      mockPrismaService.studentProfile.count.mockResolvedValue(1);

      const result = await service.findMany({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply department filter', async () => {
      mockPrismaService.studentProfile.findMany.mockResolvedValue([]);
      mockPrismaService.studentProfile.count.mockResolvedValue(0);

      await service.findMany({ department: 'CS' });

      expect(mockPrismaService.studentProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: { contains: 'CS', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // createGuardianLink
  // -----------------------------------------------------------------------
  describe('createGuardianLink', () => {
    it('should create a guardian link', async () => {
      const dto = { studentId: 'u-1', guardianId: 'g-1', relation: 'Father', isPrimary: true };
      mockPrismaService.guardianLink.findUnique.mockResolvedValue(null);
      mockPrismaService.guardianLink.updateMany.mockResolvedValue({ count: 0 });
      const created = { id: 'gl-1', ...dto };
      mockPrismaService.guardianLink.create.mockResolvedValue(created);

      const result = await service.createGuardianLink(dto as any);

      expect(result).toEqual(created);
    });

    it('should throw ConflictException on duplicate link', async () => {
      mockPrismaService.guardianLink.findUnique.mockResolvedValue({ id: 'gl-existing' });

      await expect(service.createGuardianLink({ studentId: 'u-1', guardianId: 'g-1' } as any))
        .rejects.toThrow(ConflictException);
    });
  });
});
