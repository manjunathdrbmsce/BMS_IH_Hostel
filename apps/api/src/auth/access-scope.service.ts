import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HostelScope = 'ALL' | string[];

@Injectable()
export class AccessScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessibleHostelIds(user: { id: string; roles?: string[] }): Promise<HostelScope> {
    const roles = user.roles ?? [];

    if (roles.includes('SUPER_ADMIN') || roles.includes('HOSTEL_ADMIN')) {
      return 'ALL';
    }

    if (!roles.some((role) => ['WARDEN', 'DEPUTY_WARDEN'].includes(role))) {
      return [];
    }

    const assignments = await this.prisma.userRole.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        hostelId: { not: null },
        role: { name: { in: ['WARDEN', 'DEPUTY_WARDEN'] } },
      },
      select: { hostelId: true },
    });

    return [...new Set(assignments.map((assignment) => assignment.hostelId!))];
  }

  canAccessHostel(scope: HostelScope, hostelId: string) {
    return scope === 'ALL' || scope.includes(hostelId);
  }
}
