import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { PrismaService } from '../prisma/prisma.service';
import { BuildingStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrismaService = {
  building: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  hostel: {
    count: jest.fn(),
  },
};

const mockBuilding = {
  id: 'b-1',
  code: 'MAIN',
  name: 'Main Block',
  location: 'Bengaluru',
  address: '123 Street',
  contactNo: '080-123',
  email: 'main@bms.local',
  totalFloors: 5,
  status: BuildingStatus.ACTIVE,
  description: null,
  hostels: [],
  policies: [],
  _count: { hostels: 0, policies: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BuildingsService', () => {
  let service: BuildingsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BuildingsService>(BuildingsService);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('should create a building and return enriched result', async () => {
      mockPrismaService.building.findUnique
        .mockResolvedValueOnce(null)           // duplicate check
        .mockResolvedValueOnce(mockBuilding);  // findById after create
      mockPrismaService.building.create.mockResolvedValue({ id: 'b-1' });

      const result = await service.create({ code: 'MAIN', name: 'Main Block', totalFloors: 5 });

      expect(result.id).toBe('b-1');
      expect(result.code).toBe('MAIN');
      expect(mockPrismaService.building.create).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate code', async () => {
      mockPrismaService.building.findUnique.mockResolvedValueOnce({ id: 'b-existing' });

      await expect(service.create({ code: 'MAIN', name: 'Main Block', totalFloors: 5 }))
        .rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return mapped building with relations', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);

      const result = await service.findById('b-1');

      expect(result.id).toBe('b-1');
      expect(result.hostels).toEqual([]);
      expect(result.activePolicy).toBeNull();
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // findMany
  // -----------------------------------------------------------------------
  describe('findMany', () => {
    it('should return paginated results', async () => {
      mockPrismaService.building.findMany.mockResolvedValue([mockBuilding]);
      mockPrismaService.building.count.mockResolvedValue(1);

      const result = await service.findMany({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.building.findMany.mockResolvedValue([]);
      mockPrismaService.building.count.mockResolvedValue(0);

      await service.findMany({ status: BuildingStatus.ACTIVE, page: 1, limit: 20 });

      expect(mockPrismaService.building.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: BuildingStatus.ACTIVE }),
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------
  describe('delete', () => {
    it('should deactivate building when no active hostels', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrismaService.hostel.count.mockResolvedValue(0);
      mockPrismaService.building.update.mockResolvedValue({ id: 'b-1', status: BuildingStatus.INACTIVE });

      const result = await service.delete('b-1');

      expect(result.message).toContain('deactivated');
    });

    it('should throw ConflictException when building has active hostels', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrismaService.hostel.count.mockResolvedValue(2);

      await expect(service.delete('b-1')).rejects.toThrow(ConflictException);
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      mockPrismaService.building.count
        .mockResolvedValueOnce(5)   // total
        .mockResolvedValueOnce(3)   // active
        .mockResolvedValueOnce(1)   // underMaintenance
        .mockResolvedValueOnce(0);  // underConstruction
      mockPrismaService.building.findMany.mockResolvedValue([
        { _count: { hostels: 2 } },
        { _count: { hostels: 3 } },
      ]);

      const result = await service.getStats();

      expect(result.total).toBe(5);
      expect(result.active).toBe(3);
      expect(result.totalHostelsLinked).toBe(5);
    });
  });
});
