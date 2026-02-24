import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, RoomStatus, RoomType, BedStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRoomDto,
  UpdateRoomDto,
  ListRoomsQueryDto,
  BulkCreateRoomsDto,
} from './dto';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    // Verify hostel exists
    const hostel = await this.prisma.hostel.findUnique({
      where: { id: dto.hostelId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    // Check duplicate room number in same hostel
    const existing = await this.prisma.room.findUnique({
      where: { hostelId_roomNo: { hostelId: dto.hostelId, roomNo: dto.roomNo } },
    });
    if (existing) {
      throw new ConflictException(`Room ${dto.roomNo} already exists in this hostel`);
    }

    const capacity = dto.capacity || this.getDefaultCapacity(dto.type || 'DOUBLE');

    const room = await this.prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          hostelId: dto.hostelId,
          roomNo: dto.roomNo.trim(),
          floor: dto.floor,
          block: dto.block?.trim() || null,
          type: (dto.type as RoomType) || RoomType.DOUBLE,
          capacity,
          status: RoomStatus.AVAILABLE,
          amenities: dto.amenities || [],
        },
      });

      // Auto-create beds
      const beds = Array.from({ length: capacity }, (_, i) => ({
        roomId: newRoom.id,
        bedNo: String.fromCharCode(65 + i), // A, B, C, D...
        status: BedStatus.VACANT,
      }));

      await tx.bed.createMany({ data: beds });

      return newRoom;
    });

    return this.findById(room.id);
  }

  async bulkCreate(dto: BulkCreateRoomsDto) {
    const hostel = await this.prisma.hostel.findUnique({
      where: { id: dto.hostelId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const capacity = dto.capacity || this.getDefaultCapacity(dto.type || 'DOUBLE');
    let createdCount = 0;

    for (let floor = dto.fromFloor; floor <= dto.toFloor; floor++) {
      for (let roomNum = dto.fromRoom; roomNum <= dto.toRoom; roomNum++) {
        const roomNo = dto.block
          ? `${dto.block}${floor}${String(roomNum).padStart(2, '0')}`
          : `${floor}${String(roomNum).padStart(2, '0')}`;

        const existing = await this.prisma.room.findUnique({
          where: { hostelId_roomNo: { hostelId: dto.hostelId, roomNo } },
        });

        if (!existing) {
          await this.prisma.$transaction(async (tx) => {
            const room = await tx.room.create({
              data: {
                hostelId: dto.hostelId,
                roomNo,
                floor,
                block: dto.block || null,
                type: (dto.type as RoomType) || RoomType.DOUBLE,
                capacity,
                status: RoomStatus.AVAILABLE,
                amenities: [],
              },
            });

            const beds = Array.from({ length: capacity }, (_, i) => ({
              roomId: room.id,
              bedNo: String.fromCharCode(65 + i),
              status: BedStatus.VACANT,
            }));

            await tx.bed.createMany({ data: beds });
          });
          createdCount++;
        }
      }
    }

    return {
      message: `${createdCount} rooms created successfully`,
      count: createdCount,
    };
  }

  async findById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        hostel: { select: { id: true, code: true, name: true } },
        beds: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                usn: true,
                email: true,
                mobile: true,
              },
            },
          },
          orderBy: { bedNo: 'asc' },
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');
    return this.mapRoomResponse(room);
  }

  async findMany(query: ListRoomsQueryDto) {
    const { page = 1, limit = 50, hostelId, floor, block, status, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RoomWhereInput = { hostelId };

    if (floor !== undefined) where.floor = floor;
    if (block) where.block = block;
    if (status) where.status = status as RoomStatus;
    if (type) where.type = type as RoomType;

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ floor: 'asc' }, { roomNo: 'asc' }],
        include: {
          hostel: { select: { id: true, code: true, name: true } },
          beds: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, usn: true },
              },
            },
            orderBy: { bedNo: 'asc' },
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      data: rooms.map((r) => this.mapRoomResponse(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findById(id);

    const data: Prisma.RoomUpdateInput = {};
    if (dto.roomNo) data.roomNo = dto.roomNo.trim();
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.block !== undefined) data.block = dto.block?.trim() || null;
    if (dto.type) data.type = dto.type as RoomType;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.status) data.status = dto.status as RoomStatus;
    if (dto.amenities) data.amenities = dto.amenities;

    await this.prisma.room.update({ where: { id }, data });
    return this.findById(id);
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.room.update({
      where: { id },
      data: { status: RoomStatus.CLOSED },
    });
    return { message: 'Room closed' };
  }

  private getDefaultCapacity(type: string): number {
    const map: Record<string, number> = {
      SINGLE: 1,
      DOUBLE: 2,
      TRIPLE: 3,
      QUAD: 4,
      DORMITORY: 8,
    };
    return map[type] || 2;
  }

  private mapRoomResponse(room: any) {
    const beds = room.beds || [];
    const occupied = beds.filter((b: any) => b.status === 'OCCUPIED').length;

    return {
      id: room.id,
      hostel: room.hostel,
      roomNo: room.roomNo,
      floor: room.floor,
      block: room.block,
      type: room.type,
      capacity: room.capacity,
      status: room.status,
      amenities: room.amenities,
      beds: beds.map((b: any) => ({
        id: b.id,
        bedNo: b.bedNo,
        status: b.status,
        student: b.student || null,
      })),
      occupied,
      vacant: beds.length - occupied,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }
}
