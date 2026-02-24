import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma, HostelStatus, HostelType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHostelDto, UpdateHostelDto, ListHostelsQueryDto } from './dto';

@Injectable()
export class HostelsService {
  private readonly logger = new Logger(HostelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHostelDto) {
    const existing = await this.prisma.hostel.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Hostel with code ${dto.code} already exists`);
    }

    const hostel = await this.prisma.hostel.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        type: dto.type as HostelType,
        address: dto.address?.trim() || null,
        totalBlocks: dto.totalBlocks || 1,
        contactNo: dto.contactNo?.trim() || null,
        email: dto.email?.toLowerCase().trim() || null,
        capacity: dto.capacity || 0,
        description: dto.description?.trim() || null,
      },
    });

    return this.findById(hostel.id);
  }

  async findById(id: string) {
    const hostel = await this.prisma.hostel.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            beds: true,
          },
        },
        _count: {
          select: { rooms: true },
        },
      },
    });

    if (!hostel) {
      throw new NotFoundException('Hostel not found');
    }

    return this.mapHostelResponse(hostel);
  }

  async findMany(query: ListHostelsQueryDto) {
    const { page = 1, limit = 20, search, type, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.HostelWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type as HostelType;
    }

    if (status) {
      where.status = status as HostelStatus;
    }

    const [hostels, total] = await Promise.all([
      this.prisma.hostel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          rooms: {
            include: { beds: true },
          },
          _count: { select: { rooms: true } },
        },
      }),
      this.prisma.hostel.count({ where }),
    ]);

    return {
      data: hostels.map((h) => this.mapHostelResponse(h)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdateHostelDto) {
    await this.findById(id); // Ensure exists

    const data: Prisma.HostelUpdateInput = {};
    if (dto.code) data.code = dto.code.toUpperCase().trim();
    if (dto.name) data.name = dto.name.trim();
    if (dto.type) data.type = dto.type as HostelType;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.totalBlocks !== undefined) data.totalBlocks = dto.totalBlocks;
    if (dto.contactNo !== undefined) data.contactNo = dto.contactNo?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.toLowerCase().trim() || null;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.status) data.status = dto.status as HostelStatus;

    await this.prisma.hostel.update({ where: { id }, data });

    return this.findById(id);
  }

  async delete(id: string) {
    await this.findById(id);

    await this.prisma.hostel.update({
      where: { id },
      data: { status: HostelStatus.INACTIVE },
    });

    return { message: 'Hostel deactivated' };
  }

  async getStats() {
    const [hostels, totalRooms, totalBeds] = await Promise.all([
      this.prisma.hostel.findMany({
        where: { status: HostelStatus.ACTIVE },
        include: {
          _count: { select: { rooms: true } },
          rooms: {
            include: { _count: { select: { beds: true } } },
          },
        },
      }),
      this.prisma.room.count(),
      this.prisma.bed.count(),
    ]);

    const occupiedBeds = await this.prisma.bed.count({
      where: { status: 'OCCUPIED' },
    });

    const vacantBeds = await this.prisma.bed.count({
      where: { status: 'VACANT' },
    });

    return {
      totalHostels: hostels.length,
      totalRooms,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      byType: {
        boys: hostels.filter((h) => h.type === 'BOYS').length,
        girls: hostels.filter((h) => h.type === 'GIRLS').length,
        coEd: hostels.filter((h) => h.type === 'CO_ED').length,
      },
    };
  }

  private mapHostelResponse(hostel: any) {
    const rooms = hostel.rooms || [];
    const totalBeds = rooms.reduce(
      (sum: number, room: any) => sum + (room.beds?.length || room.capacity || 0),
      0,
    );
    const occupiedBeds = rooms.reduce(
      (sum: number, room: any) =>
        sum + (room.beds?.filter((b: any) => b.status === 'OCCUPIED')?.length || 0),
      0,
    );

    return {
      id: hostel.id,
      code: hostel.code,
      name: hostel.name,
      type: hostel.type,
      address: hostel.address,
      totalBlocks: hostel.totalBlocks,
      contactNo: hostel.contactNo,
      email: hostel.email,
      status: hostel.status,
      capacity: hostel.capacity,
      description: hostel.description,
      totalRooms: hostel._count?.rooms || rooms.length,
      totalBeds,
      occupiedBeds,
      vacantBeds: totalBeds - occupiedBeds,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      createdAt: hostel.createdAt,
      updatedAt: hostel.updatedAt,
    };
  }
}
