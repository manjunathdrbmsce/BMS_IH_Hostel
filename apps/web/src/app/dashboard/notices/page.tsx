'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { NOTICE_PRIORITIES, NOTICE_SCOPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import {
  Megaphone, Plus, Search, Bell, AlertTriangle, Info, Eye,
} from 'lucide-react';

const priorityBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  INFO: 'info',
  WARNING: 'danger',
  URGENT: 'danger',
};

const priorityIconMap: Record<string, React.ElementType> = {
  INFO: Info,
  WARNING: AlertTriangle,
  URGENT: Bell,
};

const scopeBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  ALL: 'info',
  BUILDING: 'default',
  HOSTEL: 'success',
};

export default function NoticesPage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const [notices, setNotices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState({ title: '', body: '', priority: 'INFO', scope: 'ALL', targetBuildingId: '', targetHostelId: '', expiresAt: '' });

  const canPublish = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (scopeFilter) params.set('scope', scopeFilter);
      const [listRes, statsRes] = await Promise.all([
        api.get<any>(`/notices?${params}`),
        canPublish ? api.get<any>('/notices/stats') : Promise.resolve(null),
      ]);
      setNotices(listRes.data || []);
      setTotalPages(listRes.meta?.totalPages || 1);
      if (statsRes) setStats(statsRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, priorityFilter, scopeFilter, canPublish]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const payload: any = { title: form.title, body: form.body, priority: form.priority, scope: form.scope };
      if (form.scope === 'BUILDING' && form.targetBuildingId) payload.targetBuildingId = form.targetBuildingId;
      if (form.scope === 'HOSTEL' && form.targetHostelId) payload.targetHostelId = form.targetHostelId;
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
      await api.post<any>('/notices', payload);
      setShowCreate(false);
      setForm({ title: '', body: '', priority: 'INFO', scope: 'ALL', targetBuildingId: '', targetHostelId: '', expiresAt: '' });
      fetchData();
      addToast({ type: 'success', title: 'Notice published' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to publish' });
    }
  };

  const viewDetail = async (id: string) => {
    const r = await api.get<any>(`/notices/${id}`);
    setShowDetail(r.data);
    api.post<any>(`/notices/${id}/read`, {}).catch(() => {});
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch<any>(`/notices/${id}`, { isActive: !isActive });
      fetchData();
      if (showDetail?.id === id) {
        const r = await api.get<any>(`/notices/${id}`);
        setShowDetail(r.data);
      }
      addToast({ type: 'success', title: isActive ? 'Notice deactivated' : 'Notice reactivated' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to update' });
    }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014';

  return (
    <div className="min-h-screen">
      <Topbar title="Notices" subtitle="Announcements and circulars">
        {canPublish && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Publish Notice</Button>}
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && canPublish ? (
            Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard title="Active" value={stats.active} icon={Megaphone} iconColor="text-green-600" iconBg="bg-green-50" />
              <StatCard title="Total" value={stats.total} icon={Megaphone} iconColor="text-gray-600" iconBg="bg-gray-50" />
              <StatCard title="Expired" value={stats.expired} icon={Megaphone} iconColor="text-red-600" iconBg="bg-red-50" />
            </>
          ) : null}
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search notices\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Priorities</option>
              {NOTICE_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={scopeFilter} onChange={(e) => { setScopeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Scopes</option>
              {NOTICE_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div></Card>
        ) : notices.length === 0 ? (
          <EmptyState title="No notices" description="No notices published yet" />
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-gray-100">
              {notices.map((n: any) => {
                const PriorityIcon = priorityIconMap[n.priority] || Megaphone;
                return (
                  <div key={n.id} onClick={() => viewDetail(n.id)} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.priority === 'URGENT' ? 'bg-red-50' : n.priority === 'WARNING' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                        <PriorityIcon className={`h-4 w-4 ${n.priority === 'URGENT' ? 'text-red-500' : n.priority === 'WARNING' ? 'text-yellow-500' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{n.title}</h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={priorityBadge[n.priority] || 'default'}>{n.priority}</Badge>
                            <Badge variant={scopeBadge[n.scope] || 'default'}>{n.scope}{n.targetHostel ? `: ${n.targetHostel.name}` : n.targetBuilding ? `: ${n.targetBuilding.name}` : ''}</Badge>
                            {!n.isActive && <Badge variant="default">Inactive</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{n.body}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>By {n.publishedBy?.firstName} {n.publishedBy?.lastName}</span>
                          <span>{fmtDate(n.publishedAt)}</span>
                          <span><Eye className="h-3 w-3 inline mr-1" />{n._count?.recipients || 0} readers</span>
                          {n.expiresAt && <span>Expires: {fmtDate(n.expiresAt)}</span>}
                        </div>
                      </div>
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

      {/* Publish Modal */}
      {canPublish && (
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Publish Notice" size="lg">
          <div className="space-y-4">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea placeholder="Body (supports full text)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" rows={5} />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                {NOTICE_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                {NOTICE_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {form.scope === 'BUILDING' && <Input placeholder="Target Building ID" value={form.targetBuildingId} onChange={(e) => setForm({ ...form, targetBuildingId: e.target.value })} />}
            {form.scope === 'HOSTEL' && <Input placeholder="Target Hostel ID" value={form.targetHostelId} onChange={(e) => setForm({ ...form, targetHostelId: e.target.value })} />}
            <div><label className="text-xs text-gray-500">Expires At (optional)</label><Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
            <Button onClick={handleCreate} className="w-full">Publish</Button>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Notice Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{showDetail.title}</h3>
              <div className="flex gap-2">
                <Badge variant={priorityBadge[showDetail.priority] || 'default'}>{showDetail.priority}</Badge>
                <Badge variant={scopeBadge[showDetail.scope] || 'default'}>{showDetail.scope}</Badge>
              </div>
            </div>
            <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4">{showDetail.body}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Published By</span><p className="font-medium">{showDetail.publishedBy?.firstName} {showDetail.publishedBy?.lastName}</p></div>
              <div><span className="text-gray-500">Published At</span><p className="font-medium">{fmtDate(showDetail.publishedAt)}</p></div>
              {showDetail.targetBuilding && <div><span className="text-gray-500">Building</span><p className="font-medium">{showDetail.targetBuilding.name}</p></div>}
              {showDetail.targetHostel && <div><span className="text-gray-500">Hostel</span><p className="font-medium">{showDetail.targetHostel.name}</p></div>}
              {showDetail.expiresAt && <div><span className="text-gray-500">Expires</span><p className="font-medium">{fmtDate(showDetail.expiresAt)}</p></div>}
              <div><span className="text-gray-500">Readers</span><p className="font-medium">{showDetail._count?.recipients || 0} (Read: {showDetail.readCount || 0})</p></div>
            </div>
            {canPublish && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => toggleActive(showDetail.id, showDetail.isActive)} variant="outline" size="sm">
                  {showDetail.isActive ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}