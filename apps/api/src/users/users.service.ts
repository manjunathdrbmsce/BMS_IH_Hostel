import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, createdBy?: string) {
    // Check duplicates
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.mobile ? [{ mobile: dto.mobile }] : []),
          ...(dto.usn ? [{ usn: dto.usn }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('A user with this email, mobile, or USN already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          mobile: dto.mobile?.trim() || null,
          usn: dto.usn?.trim() || null,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          status: UserStatus.ACTIVE,
        },
      });

      // Assign roles if provided
      if (dto.roles && dto.roles.length > 0) {
        const roles = await tx.role.findMany({
          where: { name: { in: dto.roles } },
        });

        if (roles.length !== dto.roles.length) {
          const foundNames = roles.map((r) => r.name);
          const missing = dto.roles.filter((r) => !foundNames.includes(r));
          throw new NotFoundException(`Roles not found: ${missing.join(', ')}`);
        }

        await tx.userRole.createMany({
          data: roles.map((role) => ({
            userId: newUser.id,
            roleId: role.id,
            grantedBy: createdBy ?? null,
          })),
        });
      }

      return newUser;
    });

    return this.findById(user.id);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          where: { revokedAt: null },
          include: { role: true, hostel: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserResponse(user);
  }

  async findMany(query: ListUsersQueryDto) {
    const { page = 1, limit = 20, search, status, role } = query;
    const skip = (page - 1) * limit;

    const where = this.buildUserWhere({ search, status, role });

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: {
            where: { revokedAt: null },
            include: { role: true, hostel: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => this.mapUserResponse(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportCsv(query: ListUsersQueryDto) {
    const where = this.buildUserWhere(query);
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: {
          where: { revokedAt: null },
          include: { role: true, hostel: true },
        },
      },
    });

    const header = [
      'ID',
      'First Name',
      'Last Name',
      'Email',
      'Mobile',
      'USN',
      'Status',
      'Roles',
      'Created At',
      'Updated At',
    ];

    const rows = users.map((user) => [
      user.id,
      user.firstName,
      user.lastName,
      user.email,
      user.mobile ?? '',
      user.usn ?? '',
      user.status,
      user.userRoles.map((ur) => ur.role.displayName).join('; '),
      user.createdAt.toISOString(),
      user.updatedAt.toISOString(),
    ]);

    return [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\n');
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id); // Ensure exists

    const data: Prisma.UserUpdateInput = {};

    if (dto.email) data.email = dto.email.toLowerCase().trim();
    if (dto.mobile !== undefined) data.mobile = dto.mobile?.trim() || null;
    if (dto.usn !== undefined) data.usn = dto.usn?.trim() || null;
    if (dto.firstName) data.firstName = dto.firstName.trim();
    if (dto.lastName) data.lastName = dto.lastName.trim();
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }

    await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.findById(id);
  }

  async delete(id: string) {
    await this.findById(id); // Ensure exists

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });

    return { message: 'User deactivated' };
  }

  private buildUserWhere(query: Pick<ListUsersQueryDto, 'search' | 'status' | 'role'>) {
    const { search, status, role } = query;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { usn: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
      ];
    }

    if (status) {
      where.status = status as UserStatus;
    }

    if (role) {
      where.userRoles = {
        some: {
          revokedAt: null,
          role: { name: role },
        },
      };
    }

    return where;
  }

  private escapeCsvValue(value: string) {
    const escaped = value.replace(/"/g, '""');
    return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  private mapUserResponse(user: {
    id: string;
    email: string;
    mobile: string | null;
    usn: string | null;
    firstName: string;
    lastName: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    userRoles: Array<{
      hostelId?: string | null;
      role: { name: string; displayName: string };
      hostel?: {
        id: string;
        code: string;
        name: string;
        status: string;
      } | null;
    }>;
  }) {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      usn: user.usn,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.userRoles.map((ur) => ({
        name: ur.role.name,
        displayName: ur.role.displayName,
        hostelId: ur.hostelId ?? null,
        hostel: ur.hostel
          ? {
              id: ur.hostel.id,
              code: ur.hostel.code,
              name: ur.hostel.name,
              status: ur.hostel.status,
            }
          : null,
      })),
      assignedHostels: user.userRoles
        .filter((ur) => ur.role.name === 'WARDEN' && ur.hostel)
        .map((ur) => ({
          id: ur.hostel!.id,
          code: ur.hostel!.code,
          name: ur.hostel!.name,
          status: ur.hostel!.status,
        })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
