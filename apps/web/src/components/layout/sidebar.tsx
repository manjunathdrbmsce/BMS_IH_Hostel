'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/constants';
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
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  Shield,
} from 'lucide-react';
import { useState } from 'react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Building2,
  Building,
  DoorOpen,
  ShieldCheck,
  GraduationCap,
  BedDouble,
  ScrollText,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) =>
    hasRole(...item.roles),
  );

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 shrink-0',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              BMS Hostel
            </h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              Management Platform
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
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
                  ? 'bg-indigo-50 text-indigo-700'
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
                  {user.roles[0]?.displayName || user.roles[0]?.name}
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
