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
import Link from 'next/link';
import {
  Users,
  Building2,
  BedDouble,
  Activity,
  TrendingUp,
  Clock,
  UserCheck,
  CalendarOff,
  MessageSquareWarning,
  ScanLine,
  ShieldAlert,
  Megaphone,
  Bell,
  GraduationCap,
  Settings,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  FileText,
  AlertCircle,
  CircleDashed,
  Send,
  Home,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Utensils,
  Shield,
  LogIn,
  ChevronRight,
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

// ── Quick action link for non-admin dashboards ──────────────────────────────
interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bg: string;
}

const ROLE_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  STUDENT: [
    { label: 'Hostel Registration', href: '/dashboard/registration', icon: ClipboardList, description: 'Apply for hostel accommodation', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Leave Requests', href: '/dashboard/leave', icon: CalendarOff, description: 'Apply or track your leave', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Complaints', href: '/dashboard/complaints', icon: MessageSquareWarning, description: 'File or check complaints', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Notices', href: '/dashboard/notices', icon: Megaphone, description: 'View hostel announcements', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Violations', href: '/dashboard/violations', icon: ShieldAlert, description: 'View your violation history', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Check all notifications', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ],
  PARENT: [
    { label: 'My Ward', href: '/dashboard/students', icon: GraduationCap, description: 'View your ward details', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Leave Requests', href: '/dashboard/leave', icon: CalendarOff, description: 'Approve or track leave', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Violations', href: '/dashboard/violations', icon: ShieldAlert, description: 'Ward violation reports', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Notices', href: '/dashboard/notices', icon: Megaphone, description: 'Hostel announcements', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Check all notifications', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account preferences', color: 'text-gray-600', bg: 'bg-gray-100' },
  ],
  SECURITY_GUARD: [
    { label: 'Gate Management', href: '/dashboard/gate', icon: ScanLine, description: 'Record entry/exit scans', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Alerts & notifications', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account preferences', color: 'text-gray-600', bg: 'bg-gray-100' },
  ],
  MAINTENANCE_STAFF: [
    { label: 'Complaints', href: '/dashboard/complaints', icon: MessageSquareWarning, description: 'Assigned work orders', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Alerts & notifications', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account preferences', color: 'text-gray-600', bg: 'bg-gray-100' },
  ],
  MESS_MANAGER: [
    { label: 'Notices', href: '/dashboard/notices', icon: Megaphone, description: 'Post mess announcements', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Alerts & notifications', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account preferences', color: 'text-gray-600', bg: 'bg-gray-100' },
  ],
  MESS_STAFF: [
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Alerts & notifications', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account preferences', color: 'text-gray-600', bg: 'bg-gray-100' },
  ],
  ACCOUNTS_OFFICER: [
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Alerts & notifications', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account preferences', color: 'text-gray-600', bg: 'bg-gray-100' },
  ],
};

// ── Determine if user has admin-level dashboard access ──────────────────────
const ADMIN_ROLES = ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN'];

export default function DashboardHomePage() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationData, setRegistrationData] = useState<any[] | null>(null);

  const isAdmin = hasRole(...ADMIN_ROLES);
  const isStudent = hasRole('STUDENT');

  useEffect(() => {
    if (!isAdmin) {
      // For students, fetch their registration status
      if (isStudent) {
        api
          .get<any>('/registration/my')
          .then((res) => setRegistrationData(res.data || []))
          .catch(() => setRegistrationData([]))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
      return;
    }
    api
      .get<{ data: DashboardStats }>('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin, isStudent]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const primaryRole = user?.roles[0]?.name || '';
  const roleDisplay = user?.roles[0]?.displayName || primaryRole;

  // ── Non-admin welcome dashboard ──────────────────────────────────────────
  if (!isAdmin) {
    const quickActions = ROLE_QUICK_ACTIONS[primaryRole] || [
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, description: 'Check notifications', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings, description: 'Account preferences', color: 'text-gray-600', bg: 'bg-gray-100' },
    ];

    // Determine registration status for students
    const latestReg = registrationData?.[0];
    const regStatus: string = latestReg?.status || '';

    // Registration progress steps
    const REG_STEPS = [
      { key: 'DRAFT', label: 'Draft' },
      { key: 'SUBMITTED', label: 'Submitted' },
      { key: 'UNDER_REVIEW', label: 'Review' },
      { key: 'APPROVED', label: 'Approved' },
      { key: 'ALLOTTED', label: 'Allotted' },
    ];
    const regStepOrder = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ALLOTTED'];
    const currentStepIndex = regStepOrder.indexOf(regStatus);
    const isRejected = regStatus === 'REJECTED';
    const isCancelled = regStatus === 'CANCELLED';
    const isWaitlisted = regStatus === 'WAITLISTED';

    const regStatusMeta: Record<string, { color: string; bg: string; borderColor: string; icon: React.ElementType; label: string }> = {
      DRAFT: { color: 'text-gray-600', bg: 'bg-gray-50', borderColor: 'border-gray-300', icon: CircleDashed, label: 'Draft' },
      SUBMITTED: { color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-300', icon: Send, label: 'Submitted' },
      UNDER_REVIEW: { color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-300', icon: Clock, label: 'Under Review' },
      DOCUMENTS_PENDING: { color: 'text-orange-600', bg: 'bg-orange-50', borderColor: 'border-orange-300', icon: FileText, label: 'Docs Pending' },
      APPROVED: { color: 'text-green-600', bg: 'bg-green-50', borderColor: 'border-green-300', icon: CheckCircle2, label: 'Approved' },
      ALLOTTED: { color: 'text-emerald-600', bg: 'bg-emerald-50', borderColor: 'border-emerald-300', icon: BedDouble, label: 'Allotted' },
      REJECTED: { color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-300', icon: AlertCircle, label: 'Rejected' },
      WAITLISTED: { color: 'text-purple-600', bg: 'bg-purple-50', borderColor: 'border-purple-300', icon: Clock, label: 'Waitlisted' },
      CANCELLED: { color: 'text-gray-500', bg: 'bg-gray-50', borderColor: 'border-gray-300', icon: AlertCircle, label: 'Cancelled' },
    };

    const currentMeta = regStatusMeta[regStatus] || regStatusMeta.DRAFT;

    const today = new Date();

    return (
      <div className="min-h-screen">
        <Topbar
          title={`${greeting()}, ${user?.firstName}!`}
          subtitle="Here's what's happening across your hostel today."
        />

        <div className="p-6 space-y-6 animate-in">
          {/* ── Row 1: Stat Cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  title="Registration"
                  value={latestReg ? currentMeta.label : 'Not Started'}
                  subtitle={latestReg?.applicationNo || 'Apply now to begin'}
                  icon={ClipboardList}
                  iconColor={latestReg ? currentMeta.color : 'text-gray-400'}
                  iconBg={latestReg ? currentMeta.bg : 'bg-gray-50'}
                />
                <StatCard
                  title="Hostel"
                  value={latestReg?.hostel?.code || '—'}
                  subtitle={latestReg?.hostel?.name || 'Pending allotment'}
                  icon={Building2}
                  iconColor="text-indigo-600"
                  iconBg="bg-indigo-50"
                />
                <StatCard
                  title="Room / Bed"
                  value={latestReg?.bed?.room?.roomNumber || '—'}
                  subtitle={latestReg?.bed ? `Bed ${latestReg.bed.bedNumber}` : 'Not yet assigned'}
                  icon={BedDouble}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-50"
                />
                <StatCard
                  title="Academic Year"
                  value={latestReg?.academicYear || `${today.getFullYear()}-${today.getFullYear() + 1}`}
                  subtitle={roleDisplay}
                  icon={GraduationCap}
                  iconColor="text-emerald-600"
                  iconBg="bg-emerald-50"
                />
              </>
            )}
          </div>

          {/* ── Row 2: Registration Progress + Profile ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Registration Progress Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Registration Progress</CardTitle>
                {latestReg && (
                  <Badge variant={regStatus === 'ALLOTTED' ? 'success' : regStatus === 'REJECTED' ? 'danger' : 'info'}>
                    {currentMeta.label}
                  </Badge>
                )}
              </CardHeader>

              {loading ? (
                <Skeleton className="h-24" />
              ) : !latestReg ? (
                <div className="flex flex-col items-center text-center pt-2 pb-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
                    <ClipboardList className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Begin Your Hostel Registration</h4>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    Apply for hostel accommodation at BMS. Complete the application form and submit for review.
                  </p>
                  <Link
                    href="/dashboard/registration"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold text-sm shadow-sm"
                  >
                    Start Registration <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : isRejected || isCancelled ? (
                <div className={`flex items-start gap-4 p-4 rounded-xl border ${currentMeta.borderColor} ${currentMeta.bg}`}>
                  <AlertCircle className={`w-6 h-6 ${currentMeta.color} shrink-0 mt-0.5`} />
                  <div>
                    <p className={`font-semibold ${currentMeta.color}`}>{currentMeta.label}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {isRejected
                        ? 'Your application was not approved. Contact the hostel office for more info.'
                        : 'This registration has been cancelled.'}
                    </p>
                    {latestReg.rejectionReason && (
                      <p className="text-xs text-gray-500 mt-2">Reason: {latestReg.rejectionReason}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step tracker */}
                  <div className="flex items-center justify-between">
                    {REG_STEPS.map((s, idx) => {
                      const isCompleted = currentStepIndex > idx;
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <div key={s.key} className="flex-1 flex flex-col items-center relative">
                          {idx > 0 && (
                            <div className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                          )}
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCompleted ? 'bg-emerald-500 text-white' :
                            isCurrent ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' :
                            'bg-gray-200 text-gray-500'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-emerald-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Info bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-400 text-xs">Application</span>
                        <p className="font-semibold text-gray-900">{latestReg.applicationNo || '—'}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                      <div>
                        <span className="text-gray-400 text-xs">Academic Year</span>
                        <p className="font-semibold text-gray-900">{latestReg.academicYear}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                      <div>
                        <span className="text-gray-400 text-xs">Started</span>
                        <p className="font-semibold text-gray-900">
                          {new Date(latestReg.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {(regStatus === 'DRAFT' || regStatus === 'DOCUMENTS_PENDING') && (
                      <Link
                        href="/dashboard/registration"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium shadow-sm"
                      >
                        Continue <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {regStatus === 'ALLOTTED' && (
                      <Link
                        href="/dashboard/registration"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm"
                      >
                        View Details <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {isWaitlisted && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <Clock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-700">Waitlisted</p>
                        <p className="text-xs text-purple-600 mt-0.5">You&apos;re on the waitlist. We&apos;ll notify you when a room becomes available.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Profile Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              {/* Avatar & Name */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg shadow-indigo-200">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <p className="font-bold text-gray-900 text-lg">{user?.firstName} {user?.lastName}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full mt-1">
                  <GraduationCap className="w-3 h-3" /> {roleDisplay}
                </span>
              </div>
              {/* Info rows */}
              <div className="space-y-1">
                <ProfileRow icon={Mail} label="Email" value={user?.email || '—'} />
                <ProfileRow icon={Phone} label="Mobile" value={user?.mobile || '—'} />
                <ProfileRow icon={Shield} label="Status" value={user?.status || 'Active'} badge />
                {latestReg?.hostel && (
                  <ProfileRow icon={Building2} label="Hostel" value={latestReg.hostel.name} />
                )}
                {latestReg?.bed?.room && (
                  <ProfileRow icon={BedDouble} label="Room" value={`${latestReg.bed.room.roomNumber} / Bed ${latestReg.bed.bedNumber}`} />
                )}
              </div>
              {/* Manage link */}
              <Link
                href="/dashboard/settings"
                className="flex items-center justify-center gap-2 mt-5 py-2.5 w-full text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
              >
                <Settings className="w-4 h-4" /> Manage Profile
              </Link>
            </Card>
          </div>

          {/* ── Row 3: Quick Actions + Information ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group flex flex-col items-center gap-2.5 p-4 bg-gray-50 hover:bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-5 h-5 ${action.color}`} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors text-center">{action.label}</span>
                    </Link>
                  );
                })}
                <Link
                  href="/dashboard/settings"
                  className="group flex flex-col items-center gap-2.5 p-4 bg-gray-50 hover:bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 transition-colors text-center">Settings</span>
                </Link>
              </div>
            </Card>

            {/* Help & Info */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <div className="space-y-1">
                <InfoItem icon={Phone} title="Hostel Office" detail="+91 80 2662 2130" />
                <InfoItem icon={Mail} title="Support Email" detail="hostel@bms.edu" />
                <InfoItem icon={Clock} title="Office Hours" detail="Mon–Sat, 9 AM – 5 PM" />
                <InfoItem icon={Home} title="Campus" detail="BMS Educational Trust, Bengaluru" />
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Enterprise-grade platform with audit logging
                </p>
              </div>
            </Card>
          </div>

          {/* ── Row 4: Timeline ──────────────────────────────────────────── */}
          {isStudent && latestReg && (
            <Card>
              <CardHeader>
                <CardTitle>Registration Timeline</CardTitle>
              </CardHeader>
              <div className="space-y-0">
                {[
                  latestReg.allottedAt && { date: latestReg.allottedAt, label: 'Room Allotted', icon: BedDouble, color: 'text-emerald-600 bg-emerald-50' },
                  latestReg.approvedAt && { date: latestReg.approvedAt, label: 'Application Approved', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                  latestReg.reviewedAt && { date: latestReg.reviewedAt, label: 'Review Completed', icon: FileText, color: 'text-amber-600 bg-amber-50' },
                  latestReg.submittedAt && { date: latestReg.submittedAt, label: 'Application Submitted', icon: Send, color: 'text-blue-600 bg-blue-50' },
                  latestReg.createdAt && { date: latestReg.createdAt, label: 'Registration Created', icon: ClipboardList, color: 'text-gray-600 bg-gray-50' },
                ].filter(Boolean).map((event: any, idx: number, arr: any[]) => {
                  const EventIcon = event.icon;
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${event.color}`}>
                          <EventIcon className="w-4 h-4" />
                        </div>
                        {idx < arr.length - 1 && <div className="w-0.5 h-8 bg-gray-200" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-semibold text-gray-900">{event.label}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' at '}
                          {new Date(event.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── Admin / Warden dashboard ─────────────────────────────────────────────
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

function ProfileRow({ icon: Icon, label, value, badge }: { icon: React.ElementType; label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50/80 transition">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
      {badge ? (
        <Badge variant="success" className="text-xs">{value}</Badge>
      ) : (
        <span className="text-sm text-gray-800 font-medium truncate">{value}</span>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-xs text-gray-400">{detail}</p>
      </div>
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
