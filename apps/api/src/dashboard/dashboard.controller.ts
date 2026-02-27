import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      totalStudents,
      totalStaff,
      totalHostels,
      activeHostels,
      totalRooms,
      totalBeds,
      occupiedBeds,
      recentLogins,
      todayLogins,
      pendingUsers,
      suspendedUsers,
      recentAuditLogs,
      usersByRole,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.userRole.count({
        where: { role: { name: 'STUDENT' }, revokedAt: null },
      }),
      this.prisma.userRole.count({
        where: {
          role: { name: { notIn: ['STUDENT', 'PARENT'] } },
          revokedAt: null,
        },
      }),
      this.prisma.hostel.count(),
      this.prisma.hostel.count({ where: { status: 'ACTIVE' } }),
      this.prisma.room.count(),
      this.prisma.bed.count(),
      this.prisma.bed.count({ where: { status: 'OCCUPIED' } }),
      this.prisma.auditLog.count({
        where: { action: 'LOGIN', createdAt: { gte: weekAgo } },
      }),
      this.prisma.auditLog.count({
        where: { action: 'LOGIN', createdAt: { gte: today } },
      }),
      this.prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.userRole.groupBy({
        by: ['roleId'],
        _count: { userId: true },
        where: { revokedAt: null },
      }),
    ]);

    // Get role names for groupBy results
    const roleIds = usersByRole.map((r) => r.roleId);
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true, displayName: true },
    });

    const roleMap = new Map(roles.map((r) => [r.id, r]));
    const usersByRoleMapped = usersByRole.map((r) => ({
      role: roleMap.get(r.roleId)?.name || 'UNKNOWN',
      displayName: roleMap.get(r.roleId)?.displayName || 'Unknown',
      count: r._count.userId,
    })).sort((a, b) => b.count - a.count);

    // Login trend (last 7 days)
    const loginTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await this.prisma.auditLog.count({
        where: {
          action: 'LOGIN',
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      loginTrend.push({
        date: dayStart.toISOString().split('T')[0],
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        logins: count,
      });
    }

    return {
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          students: totalStudents,
          staff: totalStaff,
          pending: pendingUsers,
          suspended: suspendedUsers,
        },
        hostels: {
          total: totalHostels,
          active: activeHostels,
          totalRooms,
          totalBeds,
          occupiedBeds,
          vacantBeds: totalBeds - occupiedBeds,
          occupancyRate: totalBeds > 0
            ? Math.round((occupiedBeds / totalBeds) * 100)
            : 0,
        },
        buildings: await this.getBuildingStats(),
        allotments: await this.getAllotmentStats(),
        leave: await this.getLeaveStats(),
        complaints: await this.getComplaintStats(),
        notices: await this.getNoticeStats(),
        gate: await this.getGateStats(),
        violations: await this.getViolationStats(),
        notifications: await this.getNotificationStats(),
        activity: {
          todayLogins,
          weeklyLogins: recentLogins,
          loginTrend,
        },
        recentActivity: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          user: log.user
            ? `${log.user.firstName} ${log.user.lastName}`
            : 'System',
          email: log.user?.email || null,
          details: log.details,
          createdAt: log.createdAt,
        })),
        usersByRole: usersByRoleMapped,
      },
    };
  }

  private async getBuildingStats() {
    const [total, active] = await Promise.all([
      this.prisma.building.count(),
      this.prisma.building.count({ where: { status: 'ACTIVE' } }),
    ]);

    const withPolicies = await this.prisma.building.count({
      where: { policies: { some: { isActive: true } } },
    });

    return {
      total,
      active,
      withActivePolicies: withPolicies,
    };
  }

  private async getAllotmentStats() {
    const [active, vacated, transferred] = await Promise.all([
      this.prisma.bedAssignment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.bedAssignment.count({ where: { status: 'VACATED' } }),
      this.prisma.bedAssignment.count({ where: { status: 'TRANSFERRED' } }),
    ]);

    const studentProfiles = await this.prisma.studentProfile.count();

    return {
      activeAssignments: active,
      totalVacated: vacated,
      totalTransferred: transferred,
      studentProfiles,
    };
  }

  private async getLeaveStats() {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.leaveRequest.count({ where: { status: 'WARDEN_APPROVED' } }),
      this.prisma.leaveRequest.count({ where: { status: 'REJECTED' } }),
    ]);
    return { pending, approved, rejected };
  }

  private async getComplaintStats() {
    const [open, inProgress, resolved] = await Promise.all([
      this.prisma.complaint.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'REOPENED'] } } }),
      this.prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.complaint.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
    ]);
    return { open, inProgress, resolved };
  }

  private async getNoticeStats() {
    const [active, total] = await Promise.all([
      this.prisma.notice.count({ where: { isActive: true } }),
      this.prisma.notice.count(),
    ]);
    return { active, total };
  }

  private async getGateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayEntries, todayExits, todayLate] = await Promise.all([
      this.prisma.gateEntry.count({ where: { type: 'IN', timestamp: { gte: today, lt: tomorrow } } }),
      this.prisma.gateEntry.count({ where: { type: 'OUT', timestamp: { gte: today, lt: tomorrow } } }),
      this.prisma.gateEntry.count({ where: { isLateEntry: true, timestamp: { gte: today, lt: tomorrow } } }),
    ]);
    return { todayEntries, todayExits, todayLate };
  }

  private async getViolationStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayViolations, openEscalations, total] = await Promise.all([
      this.prisma.violation.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.violation.count({ where: { escalationState: { in: ['WARNED', 'ESCALATED'] } } }),
      this.prisma.violation.count(),
    ]);
    return { todayViolations, openEscalations, total };
  }

  private async getNotificationStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todaySent, total] = await Promise.all([
      this.prisma.notification.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      this.prisma.notification.count(),
    ]);
    return { todaySent, total };
  }
}
