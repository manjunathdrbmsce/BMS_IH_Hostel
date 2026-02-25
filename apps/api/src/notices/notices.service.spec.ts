import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NoticesService } from './notices.service';
import { PrismaService } from '../prisma/prisma.service';
import { NoticePriority, NoticeScope } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrisma = {
  notice: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  noticeRecipient: { upsert: jest.fn(), findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
  building: { findUnique: jest.fn() },
  hostel: { findUnique: jest.fn() },
};

const mockNotice = {
  id: 'n-1',
  title: 'Water Supply Interruption',
  body: 'Water supply will be interrupted tomorrow.',
  priority: NoticePriority.WARNING,
  scope: NoticeScope.ALL,
  targetBuildingId: null,
  targetHostelId: null,
  publishedById: 'u-admin',
  publishedAt: new Date(),
  expiresAt: new Date('2025-04-01'),
  isActive: true,
  publishedBy: { firstName: 'Admin', lastName: 'User' },
  targetBuilding: null,
  targetHostel: null,
  _count: { recipients: 15 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('NoticesService', () => {
  let service: NoticesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<NoticesService>(NoticesService);
  });

  // -----------------------------------------------------------------------
  // create
  // -----------------------------------------------------------------------
  describe('create', () => {
    it('should create a notice with ALL scope', async () => {
      mockPrisma.notice.create.mockResolvedValue(mockNotice);
      mockPrisma.notice.findUnique.mockResolvedValue(mockNotice);

      const result = await service.create({
        title: 'Water Supply Interruption', body: 'Water supply will be interrupted.',
        priority: 'WARNING', scope: 'ALL',
      }, 'u-admin');
      expect(result.id).toBe('n-1');
      expect(mockPrisma.notice.create).toHaveBeenCalled();
    });

    it('should throw if BUILDING scope but no targetBuildingId', async () => {
      await expect(service.create({
        title: 'Test', body: 'Test', priority: 'INFO', scope: 'BUILDING',
      }, 'u-admin')).rejects.toThrow(BadRequestException);
    });

    it('should throw if HOSTEL scope but no targetHostelId', async () => {
      await expect(service.create({
        title: 'Test', body: 'Test', priority: 'INFO', scope: 'HOSTEL',
      }, 'u-admin')).rejects.toThrow(BadRequestException);
    });

    it('should validate building exists for BUILDING scope', async () => {
      mockPrisma.building.findUnique.mockResolvedValue(null);
      await expect(service.create({
        title: 'Test', body: 'Test', priority: 'INFO', scope: 'BUILDING', targetBuildingId: 'bad',
      }, 'u-admin')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // findById
  // -----------------------------------------------------------------------
  describe('findById', () => {
    it('should return notice with read count', async () => {
      mockPrisma.notice.findUnique.mockResolvedValue(mockNotice);
      mockPrisma.noticeRecipient.count.mockResolvedValue(15);

      const result = await service.findById('n-1');
      expect(result.id).toBe('n-1');
      expect(result.readCount).toBe(15);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.notice.findUnique.mockResolvedValue(null);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------
  describe('update', () => {
    it('should update notice fields', async () => {
      mockPrisma.notice.findUnique
        .mockResolvedValueOnce(mockNotice)
        .mockResolvedValueOnce({ ...mockNotice, title: 'Updated Title' });
      mockPrisma.notice.update.mockResolvedValue({});
      mockPrisma.noticeRecipient.count.mockResolvedValue(15);

      const result = await service.update('n-1', { title: 'Updated Title' });
      expect(mockPrisma.notice.update).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // markRead
  // -----------------------------------------------------------------------
  describe('markRead', () => {
    it('should create notice recipient record', async () => {
      mockPrisma.notice.findUnique.mockResolvedValue(mockNotice);
      mockPrisma.noticeRecipient.count.mockResolvedValue(15);
      mockPrisma.noticeRecipient.findUnique.mockResolvedValue(null); // not yet read
      mockPrisma.noticeRecipient.create.mockResolvedValue({ id: 'nr-1' });

      await service.markRead('n-1', 'u-1');
      expect(mockPrisma.noticeRecipient.create).toHaveBeenCalled();
    });

    it('should throw if notice not found', async () => {
      mockPrisma.notice.findUnique.mockResolvedValue(null);
      await expect(service.markRead('bad', 'u-1')).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------------
  // getStats
  // -----------------------------------------------------------------------
  describe('getStats', () => {
    it('should return notice statistics', async () => {
      mockPrisma.notice.count
        .mockResolvedValueOnce(20)  // total
        .mockResolvedValueOnce(15)  // active
        .mockResolvedValueOnce(3);  // expired
      mockPrisma.notice.groupBy
        .mockResolvedValueOnce([{ priority: 'WARNING', _count: { id: 8 } }])
        .mockResolvedValueOnce([{ scope: 'ALL', _count: { id: 12 } }]);

      const result = await service.getStats();
      expect(result.total).toBe(20);
      expect(result.active).toBe(15);
      expect(result.expired).toBe(3);
    });
  });
});
