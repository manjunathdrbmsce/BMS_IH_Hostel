import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrismaService = {
  buildingPolicy: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  building: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('PoliciesService', () => {
  let service: PoliciesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('should create policy with auto-versioning via transaction', async () => {
      const dto = {
        buildingId: 'b-1',
        weekdayCurfew: '22:00',
        weekendCurfew: '23:00',
        toleranceMin: 15,
        parentApprovalRequired: true,
        maxLeaveDays: 7,
        wardenEscalationMin: 30,
        repeatedViolationThreshold: 3,
      };

      mockPrismaService.building.findUnique.mockResolvedValue({ id: 'b-1' });
      const newPolicy = { id: 'p-1', ...dto, version: 2, isActive: true };
      mockPrismaService.$transaction.mockResolvedValue(newPolicy);

      const result = await service.create(dto as any, 'user-1');

      expect(result).toEqual(newPolicy);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when building not found', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(null);

      await expect(service.create({ buildingId: 'nonexistent' } as any, 'user-1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getActiveForBuilding
  // -----------------------------------------------------------------------
  describe('getActiveForBuilding', () => {
    it('should return active policy for building', async () => {
      const policy = { id: 'p-1', buildingId: 'b-1', isActive: true, version: 1, building: { name: 'Main' } };
      mockPrismaService.buildingPolicy.findFirst.mockResolvedValue(policy);

      const result = await service.getActiveForBuilding('b-1');

      expect(result).toEqual(policy);
    });

    it('should throw NotFoundException when no active policy found', async () => {
      mockPrismaService.buildingPolicy.findFirst.mockResolvedValue(null);

      await expect(service.getActiveForBuilding('b-1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return policy by id', async () => {
      const policy = { id: 'p-1', buildingId: 'b-1', building: { name: 'Main' } };
      mockPrismaService.buildingPolicy.findUnique.mockResolvedValue(policy);

      const result = await service.findById('p-1');

      expect(result).toEqual(policy);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.buildingPolicy.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getVersionHistory
  // -----------------------------------------------------------------------
  describe('getVersionHistory', () => {
    it('should return version history ordered by version desc', async () => {
      const policies = [
        { id: 'p-2', version: 2, isActive: true },
        { id: 'p-1', version: 1, isActive: false },
      ];
      mockPrismaService.buildingPolicy.findMany.mockResolvedValue(policies);

      const result = await service.getVersionHistory('b-1');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.buildingPolicy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buildingId: 'b-1' },
          orderBy: { version: 'desc' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // findMany
  // -----------------------------------------------------------------------
  describe('findMany', () => {
    it('should apply activeOnly filter', async () => {
      mockPrismaService.buildingPolicy.findMany.mockResolvedValue([]);
      mockPrismaService.buildingPolicy.count.mockResolvedValue(0);

      await service.findMany({ activeOnly: true });

      expect(mockPrismaService.buildingPolicy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should filter by buildingId', async () => {
      mockPrismaService.buildingPolicy.findMany.mockResolvedValue([]);
      mockPrismaService.buildingPolicy.count.mockResolvedValue(0);

      await service.findMany({ buildingId: 'b-1' });

      expect(mockPrismaService.buildingPolicy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ buildingId: 'b-1' }),
        }),
      );
    });
  });
});
