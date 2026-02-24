'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import {
  Users,
  Building2,
  BedDouble,
  Activity,
  TrendingUp,
  Clock,
  UserCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    students: number;
    staff: number;
    pending: number;
    suspended: number;
  };
  hostels: {
    total: number;
    active: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    occupancyRate: number;
  };
  activity: {
    todayLogins: number;
    weeklyLogins: number;
    loginTrend: Array<{ date: string; day: string; logins: number }>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    user: string;
    email: string | null;
    createdAt: string;
  }>;
  usersByRole: Array<{
    role: string;
    displayName: string;
    count: number;
  }>;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: DashboardStats }>('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen">
      <Topbar
        title={`${greeting()}, ${user?.firstName}!`}
        subtitle="Here's what's happening across your hostels today."
      />

      <div className="p-6 space-y-6 animate-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard
                title="Total Users"
                value={stats.users.total}
                subtitle={`${stats.users.active} active`}
                icon={Users}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-50"
              />
              <StatCard
                title="Active Hostels"
                value={stats.hostels.active}
                subtitle={`${stats.hostels.totalRooms} rooms`}
                icon={Building2}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
              <StatCard
                title="Total Beds"
                value={stats.hostels.totalBeds}
                subtitle={`${stats.hostels.occupancyRate}% occupancy`}
                icon={BedDouble}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
              <StatCard
                title="Today's Logins"
                value={stats.activity.todayLogins}
                subtitle={`${stats.activity.weeklyLogins} this week`}
                icon={Activity}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
              />
            </>
          ) : null}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Login Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Login Activity (7 Days)</CardTitle>
              <Badge variant="info">
                <TrendingUp className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </CardHeader>
            {loading ? (
              <Skeleton className="h-[250px]" />
            ) : stats ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.activity.loginTrend}>
                  <defs>
                    <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area type="monotone" dataKey="logins" stroke="#4f46e5" strokeWidth={2} fill="url(#loginGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </Card>

          {/* Users by Role */}
          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
            </CardHeader>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))}
              </div>
            ) : stats ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.usersByRole.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="displayName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <Badge variant="default">
                <Clock className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </CardHeader>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : stats?.recentActivity ? (
              <div className="space-y-1">
                {stats.recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{act.user}</span>{' '}
                        <span className="text-gray-500">{formatAction(act.action)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatRelativeTime(act.createdAt)}
                        {act.email && ` · ${act.email}`}
                      </p>
                    </div>
                    <Badge variant="default" className="shrink-0 text-[10px]">{act.resource}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Platform Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
            </CardHeader>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-1">
                <OverviewRow label="Active Students" value={stats.users.students} icon={UserCheck} color="text-emerald-600" />
                <OverviewRow label="Staff Members" value={stats.users.staff} icon={Users} color="text-blue-600" />
                <OverviewRow label="Pending Verification" value={stats.users.pending} icon={Clock} color="text-amber-600" />
                <OverviewRow label="Suspended Accounts" value={stats.users.suspended} icon={Activity} color="text-red-600" />
                <OverviewRow label="Active Hostels" value={stats.hostels.active} icon={Building2} color="text-indigo-600" />
                <OverviewRow label="Vacant Beds" value={stats.hostels.vacantBeds} icon={BedDouble} color="text-purple-600" />
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewRow({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    LOGIN: 'signed in',
    LOGOUT: 'signed out',
    LOGIN_FAILED: 'failed login attempt',
    USER_CREATE: 'created a user',
    USER_UPDATE: 'updated a user',
    USER_DELETE: 'deactivated a user',
    TOKEN_REFRESH: 'refreshed session',
    PASSWORD_CHANGE: 'changed password',
    ROLE_ASSIGN: 'assigned a role',
    HOSTEL_CREATE: 'created a hostel',
    SYSTEM_CONFIG_UPDATE: 'updated config',
    USER_STATUS_CHANGE: 'changed user status',
    RATE_LIMIT_EXCEEDED: 'exceeded rate limit',
  };
  return map[action] || action.toLowerCase().replace(/_/g, ' ');
}
