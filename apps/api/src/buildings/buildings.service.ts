import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma, BuildingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto, UpdateBuildingDto, ListBuildingsQueryDto } from './dto';

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBuildingDto) {
    const existing = await this.prisma.building.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Building with code ${dto.code} already exists`);
    }

    const building = await this.prisma.building.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        location: dto.location?.trim() || null,
        address: dto.address?.trim() || null,
        contactNo: dto.contactNo?.trim() || null,
        email: dto.email?.toLowerCase().trim() || null,
        totalFloors: dto.totalFloors || 1,
        description: dto.description?.trim() || null,
      },
    });

    return this.findById(building.id);
  }

  async findById(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        hostels: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
            capacity: true,
          },
        },
        policies: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
        _count: {
          select: { hostels: true, policies: true },
        },
      },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.mapResponse(building);
  }

  async findMany(query: ListBuildingsQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BuildingWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as BuildingStatus;
    }

    const [buildings, total] = await Promise.all([
      this.prisma.building.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          hostels: {
            select: { id: true, code: true, name: true, type: true, status: true },
          },
          policies: {
            where: { isActive: true },
            orderBy: { version: 'desc' },
            take: 1,
          },
          _count: { select: { hostels: true, policies: true } },
        },
      }),
      this.prisma.building.count({ where }),
    ]);

    return {
      data: buildings.map((b) => this.mapResponse(b)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdateBuildingDto) {
    await this.findById(id);

    const data: Prisma.BuildingUpdateInput = {};
    if (dto.code) data.code = dto.code.toUpperCase().trim();
    if (dto.name) data.name = dto.name.trim();
    if (dto.location !== undefined) data.location = dto.location?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.contactNo !== undefined) data.contactNo = dto.contactNo?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.toLowerCase().trim() || null;
    if (dto.totalFloors !== undefined) data.totalFloors = dto.totalFloors;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.status) data.status = dto.status as BuildingStatus;

    await this.prisma.building.update({ where: { id }, data });

    return this.findById(id);
  }

  async delete(id: string) {
    const building = await this.findById(id);

    // Check if building has active hostels
    const activeHostels = await this.prisma.hostel.count({
      where: { buildingId: id, status: 'ACTIVE' },
    });

    if (activeHostels > 0) {
      throw new ConflictException(
        `Cannot deactivate building with ${activeHostels} active hostel(s). Deactivate hostels first.`,
      );
    }

    await this.prisma.building.update({
      where: { id },
      data: { status: BuildingStatus.INACTIVE },
    });

    return { message: 'Building deactivated' };
  }

  async getStats() {
    const [total, active, underMaintenance, underConstruction] = await Promise.all([
      this.prisma.building.count(),
      this.prisma.building.count({ where: { status: 'ACTIVE' } }),
      this.prisma.building.count({ where: { status: 'UNDER_MAINTENANCE' } }),
      this.prisma.building.count({ where: { status: 'UNDER_CONSTRUCTION' } }),
    ]);

    const buildings = await this.prisma.building.findMany({
      where: { status: 'ACTIVE' },
      include: { _count: { select: { hostels: true } } },
    });

    const totalHostelsLinked = buildings.reduce((sum, b) => sum + b._count.hostels, 0);

    return {
      total,
      active,
      underMaintenance,
      underConstruction,
      inactive: total - active - underMaintenance - underConstruction,
      totalHostelsLinked,
    };
  }

  private mapResponse(building: any) {
    return {
      id: building.id,
      code: building.code,
      name: building.name,
      location: building.location,
      address: building.address,
      contactNo: building.contactNo,
      email: building.email,
      totalFloors: building.totalFloors,
      status: building.status,
      description: building.description,
      hostels: building.hostels || [],
      activePolicy: building.policies?.[0] || null,
      _count: building._count,
      createdAt: building.createdAt,
      updatedAt: building.updatedAt,
    };
  }
}
