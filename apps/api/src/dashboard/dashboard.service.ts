import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all dashboard statistics in a single call.
     * Optimisations:
     *  - All independent count queries are batched into Promise.all
     *  - Login trend uses a single groupBy instead of N+1 loop
     */
    async getStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        // ── Batch ALL independent counts in one Promise.all ───────────
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
            weeklyLogins,
            todayLogins,
            pendingUsers,
            suspendedUsers,
            recentAuditLogs,
            usersByRole,
            // Building stats
            totalBuildings,
            activeBuildings,
            buildingsWithPolicies,
            // Allotment stats
            activeAssignments,
            vacatedAssignments,
            transferredAssignments,
            studentProfiles,
            // Leave stats
            pendingLeave,
            approvedLeave,
            rejectedLeave,
            // Complaint stats
            openComplaints,
            inProgressComplaints,
            resolvedComplaints,
            // Notice stats
            activeNotices,
            totalNotices,
            // Gate stats
            todayEntries,
            todayExits,
            todayLate,
            // Violation stats
            todayViolations,
            openEscalations,
            totalViolations,
            // Notification stats
            todaySentNotifications,
            totalNotifications,
            // Login trend (single groupBy replaces N+1 loop)
            loginTrendRaw,
        ] = await Promise.all([
            // ── User counts ──
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
            // ── Hostel counts ──
            this.prisma.hostel.count(),
            this.prisma.hostel.count({ where: { status: 'ACTIVE' } }),
            this.prisma.room.count(),
            this.prisma.bed.count(),
            this.prisma.bed.count({ where: { status: 'OCCUPIED' } }),
            // ── Login activity ──
            this.prisma.auditLog.count({
                where: { action: 'LOGIN', createdAt: { gte: weekAgo } },
            }),
            this.prisma.auditLog.count({
                where: { action: 'LOGIN', createdAt: { gte: today } },
            }),
            // ── User status ──
            this.prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
            this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
            // ── Recent activity ──
            this.prisma.auditLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            // ── Users by role ──
            this.prisma.userRole.groupBy({
                by: ['roleId'],
                _count: { userId: true },
                where: { revokedAt: null },
            }),
            // ── Building stats ──
            this.prisma.building.count(),
            this.prisma.building.count({ where: { status: 'ACTIVE' } }),
            this.prisma.building.count({
                where: { policies: { some: { isActive: true } } },
            }),
            // ── Allotment stats ──
            this.prisma.bedAssignment.count({ where: { status: 'ACTIVE' } }),
            this.prisma.bedAssignment.count({ where: { status: 'VACATED' } }),
            this.prisma.bedAssignment.count({ where: { status: 'TRANSFERRED' } }),
            this.prisma.studentProfile.count(),
            // ── Leave stats ──
            this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
            this.prisma.leaveRequest.count({ where: { status: 'WARDEN_APPROVED' } }),
            this.prisma.leaveRequest.count({ where: { status: 'REJECTED' } }),
            // ── Complaint stats ──
            this.prisma.complaint.count({
                where: { status: { in: ['OPEN', 'ASSIGNED', 'REOPENED'] } },
            }),
            this.prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
            this.prisma.complaint.count({
                where: { status: { in: ['RESOLVED', 'CLOSED'] } },
            }),
            // ── Notice stats ──
            this.prisma.notice.count({ where: { isActive: true } }),
            this.prisma.notice.count(),
            // ── Gate stats (today) ──
            this.prisma.gateEntry.count({
                where: { type: 'IN', timestamp: { gte: today, lt: tomorrow } },
            }),
            this.prisma.gateEntry.count({
                where: { type: 'OUT', timestamp: { gte: today, lt: tomorrow } },
            }),
            this.prisma.gateEntry.count({
                where: {
                    isLateEntry: true,
                    timestamp: { gte: today, lt: tomorrow },
                },
            }),
            // ── Violation stats ──
            this.prisma.violation.count({
                where: { createdAt: { gte: today, lt: tomorrow } },
            }),
            this.prisma.violation.count({
                where: { escalationState: { in: ['WARNED', 'ESCALATED'] } },
            }),
            this.prisma.violation.count(),
            // ── Notification stats ──
            this.prisma.notification.count({
                where: { createdAt: { gte: today, lt: tomorrow } },
            }),
            this.prisma.notification.count(),
            // ── Login trend: single groupBy replaces N+1 loop ──
            this.prisma.auditLog.groupBy({
                by: ['createdAt'],
                _count: { id: true },
                where: {
                    action: 'LOGIN',
                    createdAt: { gte: weekAgo },
                },
            }),
        ]);

        // ── Process users-by-role ──
        const roleIds = usersByRole.map((r) => r.roleId);
        const roles = await this.prisma.role.findMany({
            where: { id: { in: roleIds } },
            select: { id: true, name: true, displayName: true },
        });
        const roleMap = new Map(roles.map((r) => [r.id, r]));
        const usersByRoleMapped = usersByRole
            .map((r) => ({
                role: roleMap.get(r.roleId)?.name || 'UNKNOWN',
                displayName: roleMap.get(r.roleId)?.displayName || 'Unknown',
                count: r._count.userId,
            }))
            .sort((a, b) => b.count - a.count);

        // ── Process login trend from groupBy results ──
        // Bucket the raw groupBy results into 7 daily buckets
        const loginBuckets = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            loginBuckets.set(d.toISOString().split('T')[0], 0);
        }
        for (const entry of loginTrendRaw) {
            const dateKey = new Date(entry.createdAt)
                .toISOString()
                .split('T')[0];
            if (loginBuckets.has(dateKey)) {
                loginBuckets.set(
                    dateKey,
                    (loginBuckets.get(dateKey) || 0) + entry._count.id,
                );
            }
        }
        const loginTrend = [...loginBuckets.entries()].map(([date, logins]) => {
            const d = new Date(date + 'T00:00:00');
            return {
                date,
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                logins,
            };
        });

        return {
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
                occupancyRate:
                    totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
            },
            buildings: {
                total: totalBuildings,
                active: activeBuildings,
                withActivePolicies: buildingsWithPolicies,
            },
            allotments: {
                activeAssignments,
                totalVacated: vacatedAssignments,
                totalTransferred: transferredAssignments,
                studentProfiles,
            },
            leave: { pending: pendingLeave, approved: approvedLeave, rejected: rejectedLeave },
            complaints: { open: openComplaints, inProgress: inProgressComplaints, resolved: resolvedComplaints },
            notices: { active: activeNotices, total: totalNotices },
            gate: { todayEntries, todayExits, todayLate },
            violations: { todayViolations, openEscalations, total: totalViolations },
            notifications: { todaySent: todaySentNotifications, total: totalNotifications },
            activity: {
                todayLogins,
                weeklyLogins,
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
        };
    }
}
