import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePolicyDto, UpdatePolicyDto, ListPoliciesQueryDto } from './dto';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new policy version for a building.
   * Automatically deactivates previous versions and bumps version number.
   */
  async create(dto: CreatePolicyDto, createdById?: string) {
    // Verify building exists
    const building = await this.prisma.building.findUnique({
      where: { id: dto.buildingId },
    });
    if (!building) {
      throw new NotFoundException(`Building ${dto.buildingId} not found`);
    }

    // Get latest version for this building
    const latestPolicy = await this.prisma.buildingPolicy.findFirst({
      where: { buildingId: dto.buildingId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latestPolicy ? latestPolicy.version + 1 : 1;

    // Deactivate all previous active policies for this building, then create new
    const policy = await this.prisma.$transaction(async (tx) => {
      await tx.buildingPolicy.updateMany({
        where: { buildingId: dto.buildingId, isActive: true },
        data: { isActive: false },
      });

      return tx.buildingPolicy.create({
        data: {
          buildingId: dto.buildingId,
          version: nextVersion,
          isActive: true,
          weekdayCurfew: dto.weekdayCurfew ?? '22:00',
          weekendCurfew: dto.weekendCurfew ?? '23:00',
          toleranceMin: dto.toleranceMin ?? 15,
          parentApprovalRequired: dto.parentApprovalRequired ?? true,
          maxLeaveDays: dto.maxLeaveDays ?? 7,
          wardenEscalationMin: dto.wardenEscalationMin ?? 30,
          repeatedViolationThreshold: dto.repeatedViolationThreshold ?? 3,
          notifyParentOnExit: dto.notifyParentOnExit ?? true,
          notifyParentOnEntry: dto.notifyParentOnEntry ?? true,
          notifyParentOnLate: dto.notifyParentOnLate ?? true,
          notifyWardenOnLate: dto.notifyWardenOnLate ?? true,
          overrideNotes: dto.overrideNotes?.trim() || null,
          createdBy: createdById || null,
        },
        include: { building: { select: { id: true, code: true, name: true } } },
      });
    });

    this.logger.log(
      `Policy v${nextVersion} created for building ${building.code} by ${createdById}`,
    );

    return policy;
  }

  async findById(id: string) {
    const policy = await this.prisma.buildingPolicy.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, code: true, name: true, status: true } },
      },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    return policy;
  }

  async findMany(query: ListPoliciesQueryDto) {
    const { page = 1, limit = 20, buildingId, activeOnly } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BuildingPolicyWhereInput = {};

    if (buildingId) {
      where.buildingId = buildingId;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const [policies, total] = await Promise.all([
      this.prisma.buildingPolicy.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ buildingId: 'asc' }, { version: 'desc' }],
        include: {
          building: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.buildingPolicy.count({ where }),
    ]);

    return {
      data: policies,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the active policy for a specific building.
   */
  async getActiveForBuilding(buildingId: string) {
    const policy = await this.prisma.buildingPolicy.findFirst({
      where: { buildingId, isActive: true },
      include: {
        building: { select: { id: true, code: true, name: true } },
      },
    });

    if (!policy) {
      throw new NotFoundException(`No active policy found for building ${buildingId}`);
    }

    return policy;
  }

  /**
   * Update creates a new version (immutable versioning).
   * Use this to revise a building's policy — old version is kept for audit.
   */
  async revise(buildingId: string, dto: UpdatePolicyDto, createdById?: string) {
    // Get current active policy as the base
    const current = await this.prisma.buildingPolicy.findFirst({
      where: { buildingId, isActive: true },
    });

    if (!current) {
      throw new NotFoundException(`No active policy for building ${buildingId} to revise`);
    }

    // Merge current values with update
    const merged: CreatePolicyDto = {
      buildingId,
      weekdayCurfew: dto.weekdayCurfew ?? current.weekdayCurfew,
      weekendCurfew: dto.weekendCurfew ?? current.weekendCurfew,
      toleranceMin: dto.toleranceMin ?? current.toleranceMin,
      parentApprovalRequired: dto.parentApprovalRequired ?? current.parentApprovalRequired,
      maxLeaveDays: dto.maxLeaveDays ?? current.maxLeaveDays,
      wardenEscalationMin: dto.wardenEscalationMin ?? current.wardenEscalationMin,
      repeatedViolationThreshold:
        dto.repeatedViolationThreshold ?? current.repeatedViolationThreshold,
      notifyParentOnExit: dto.notifyParentOnExit ?? current.notifyParentOnExit,
      notifyParentOnEntry: dto.notifyParentOnEntry ?? current.notifyParentOnEntry,
      notifyParentOnLate: dto.notifyParentOnLate ?? current.notifyParentOnLate,
      notifyWardenOnLate: dto.notifyWardenOnLate ?? current.notifyWardenOnLate,
      overrideNotes: dto.overrideNotes ?? current.overrideNotes ?? undefined,
    };

    return this.create(merged, createdById);
  }

  /**
   * Get version history for a building.
   */
  async getVersionHistory(buildingId: string) {
    const policies = await this.prisma.buildingPolicy.findMany({
      where: { buildingId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isActive: true,
        weekdayCurfew: true,
        weekendCurfew: true,
        toleranceMin: true,
        createdAt: true,
        createdBy: true,
      },
    });

    return policies;
  }
}
