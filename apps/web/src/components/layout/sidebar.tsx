'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { NAV_SECTIONS, type NavSection } from '@/lib/constants';
import { Avatar } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  Building2,
  Building,
  DoorOpen,
  ShieldCheck,
  GraduationCap,
  BedDouble,
  CalendarOff,
  MessageSquareWarning,
  Megaphone,
  ScanLine,
  ShieldAlert,
  ClipboardCheck,
  Bell,
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  Shield,
  UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const SUPER_ADMIN_PERMISSION_STORAGE_KEY = 'bms.super-admin.roles-responsibilities.v1';
const SUPER_ADMIN_PERMISSION_CHANGE_EVENT = 'super-admin-permissions-change';

const superAdminNavPermissions: Record<string, string[]> = {
  '/dashboard': ['DASHBOARD_VIEW_GLOBAL'],
  '/dashboard/users': ['USER_CREATE', 'USER_EXPORT', 'ROLE_ASSIGN'],
  '/dashboard/buildings': ['BUILDING_MANAGE'],
  '/dashboard/hostels': ['HOSTEL_MANAGE', 'WARDEN_ASSIGN'],
  '/dashboard/rooms': ['ROOM_MANAGE'],
  '/dashboard/policies': ['POLICY_MANAGE'],
  '/dashboard/students': ['STUDENT_PROFILE_MANAGE'],
  '/dashboard/allotments': ['ALLOTMENT_MANAGE'],
  '/dashboard/registration': ['REGISTRATION_VIEW', 'REGISTRATION_DRAFT_EDIT'],
  '/dashboard/leave': ['LEAVE_STATS_VIEW', 'LEAVE_ADMIN_DECIDE', 'LEAVE_PARENT_OVERRIDE'],
  '/dashboard/gate': ['GATE_MANAGE'],
  '/dashboard/attendance': ['ATTENDANCE_STATS_VIEW', 'ROLL_CALL_CREATE', 'ROLL_CALL_MANAGE'],
  '/dashboard/violations': ['VIOLATION_MANAGE'],
  '/dashboard/complaints': ['COMPLAINT_MANAGE', 'COMPLAINT_CREATE_ON_BEHALF'],
  '/dashboard/notices': ['NOTICE_MANAGE'],
};

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Building2,
  Building,
  DoorOpen,
  ShieldCheck,
  GraduationCap,
  BedDouble,
  CalendarOff,
  MessageSquareWarning,
  Megaphone,
  ScanLine,
  ShieldAlert,
  ClipboardCheck,
  Bell,
  ScrollText,
  Settings,
  Shield,
  UtensilsCrossed,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [superAdminPermissions, setSuperAdminPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadPermissions = () => {
      try {
        const stored = localStorage.getItem(SUPER_ADMIN_PERMISSION_STORAGE_KEY);
        setSuperAdminPermissions(stored ? JSON.parse(stored) : {});
      } catch {
        setSuperAdminPermissions({});
      }
    };

    loadPermissions();
    window.addEventListener(SUPER_ADMIN_PERMISSION_CHANGE_EVENT, loadPermissions);
    window.addEventListener('storage', loadPermissions);

    return () => {
      window.removeEventListener(SUPER_ADMIN_PERMISSION_CHANGE_EVENT, loadPermissions);
      window.removeEventListener('storage', loadPermissions);
    };
  }, []);

  const isSuperAdmin = hasRole('SUPER_ADMIN');

  const isSuperAdminFeatureVisible = (href: string) => {
    if (!isSuperAdmin) return true;
    if (href === '/dashboard/roles-responsibilities' || href === '/dashboard/settings') return true;

    const permissionKeys = superAdminNavPermissions[href];
    if (!permissionKeys) return true;

    return permissionKeys.some((key) => {
      if (superAdminPermissions[key] !== undefined) {
        return superAdminPermissions[key] !== false;
      }

      return user?.permissions?.includes(key) ?? true;
    });
  };

  // Filter sections: only show sections that have at least one visible item
  const visibleSections: NavSection[] = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasRole(...item.roles) && isSuperAdminFeatureVisible(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 shrink-0',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100">
        <img src="/logo.svg" alt="BMS Logo" className="w-9 h-9 rounded-lg shrink-0 object-contain" />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-gray-900 leading-tight">
              BMS International Hostel
            </h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              Management Platform
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {visibleSections.map((section, sIdx) => (
          <div key={section.label}>
            {/* Section header — hidden when collapsed, skip for first section */}
            {!collapsed && sIdx > 0 && (
              <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            )}
            {/* Thin divider when collapsed */}
            {collapsed && sIdx > 0 && (
              <div className="mx-3 my-2 h-px bg-gray-100" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 shrink-0',
                        isActive ? 'text-indigo-600' : 'text-gray-400',
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition"
        >
          <ChevronLeft
            className={cn(
              'w-4 h-4 transition-transform',
              collapsed && 'rotate-180',
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              size="sm"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.roles[0]?.displayName || user.roles[0]?.name || 'User'}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
