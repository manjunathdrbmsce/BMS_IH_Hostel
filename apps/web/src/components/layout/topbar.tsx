'use client';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Bell, Search, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Topbar({ title, subtitle, children }: TopbarProps) {
  const { user, token } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const fetchCount = async () => {
      try {
        const res = await api.get<any>('/notifications/unread-count');
        setUnreadCount(res.data?.count || 0);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {title && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Page actions */}
        {children}

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 w-64
                       focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none
                       transition-all duration-200"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <Link href="/dashboard/notifications" className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User */}
        {user && (
          <div className="flex items-center gap-3 ml-2 pl-3 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500">
                {user.roles[0]?.displayName || 'User'}
              </p>
            </div>
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              size="sm"
            />
          </div>
        )}
      </div>
    </header>
  );
}
