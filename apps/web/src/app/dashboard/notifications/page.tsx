'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import {
  Bell, Search, CheckCheck, Mail, Smartphone, Megaphone, Inbox,
} from 'lucide-react';

const channelIcon: Record<string, React.ElementType> = {
  IN_APP: Bell,
  EMAIL: Mail,
  SMS: Smartphone,
  PUSH: Megaphone,
};

export default function NotificationsPage() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.get<any>(`/notifications?${params}`);
      setNotifications(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      const cRes = await api.get<any>('/notifications/unread-count');
      setUnreadCount(cRes.data?.count || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch<any>(`/notifications/${id}/read`, {});
      fetchData();
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch<any>('/notifications/read-all', {});
      fetchData();
      addToast({ type: 'success', title: 'All notifications marked as read' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed' });
    }
  };

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014';

  return (
    <div className="min-h-screen">
      <Topbar
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
      >
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline">
            <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
          </Button>
        )}
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Unread" value={unreadCount} icon={Bell} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatCard title="Total" value={notifications.length > 0 ? `${(page - 1) * 20 + notifications.length}+` : '0'} icon={Inbox} iconColor="text-gray-600" iconBg="bg-gray-50" />
              <StatCard title="Page" value={`${page} / ${totalPages}`} icon={Mail} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
            </>
          )}
        </div>

        {/* Search */}
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search notifications\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div></Card>
        ) : notifications.length === 0 ? (
          <EmptyState title="No notifications" description="You're all caught up" />
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-gray-100">
              {notifications.map((n: any) => {
                const ChannelIcon = channelIcon[n.channel] || Bell;
                return (
                  <div key={n.id} className={`flex items-start justify-between gap-3 p-4 transition-colors ${!n.readAt ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${!n.readAt ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <ChannelIcon className={`h-4 w-4 ${!n.readAt ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${!n.readAt ? 'text-blue-900' : 'text-gray-900'}`}>{n.title}</p>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{fmtDate(n.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={n.state === 'SENT' ? 'success' : 'default'}>{n.state}</Badge>
                      {!n.readAt && (
                        <button onClick={() => handleMarkRead(n.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}