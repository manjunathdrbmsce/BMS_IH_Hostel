'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  Bell, Search, CheckCheck, Mail, Smartphone, Megaphone,
} from 'lucide-react';

const channelIcon: Record<string, React.ReactNode> = {
  IN_APP: <Bell className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <Smartphone className="h-4 w-4" />,
  PUSH: <Megaphone className="h-4 w-4" />,
};

export default function NotificationsPage() {
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch<any>(`/notifications/${id}/read`, {});
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch<any>('/notifications/read-all', {});
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline">
            <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search notifications…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
      </div>

      {loading ? <Spinner /> : (
        notifications.length === 0 ? <EmptyState title="No notifications" description="You're all caught up" /> : (
          <div className="space-y-2">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                className={`rounded-lg border p-4 transition-shadow ${!n.readAt ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-400">{channelIcon[n.channel] || <Bell className="h-4 w-4" />}</div>
                    <div>
                      <p className={`font-medium text-sm ${!n.readAt ? 'text-blue-900' : 'text-gray-900'}`}>{n.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(n.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={n.state === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{n.state}</Badge>
                    {!n.readAt && (
                      <button onClick={() => handleMarkRead(n.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )
      )}
    </div>
  );
}
