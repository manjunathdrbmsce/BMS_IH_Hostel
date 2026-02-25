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
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  Megaphone, Plus, Search, Bell, AlertTriangle, Info, Eye,
} from 'lucide-react';

const priorityColor: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  URGENT: 'bg-red-100 text-red-800',
};

const priorityIcon: Record<string, React.ReactNode> = {
  INFO: <Info className="h-5 w-5 text-blue-500" />,
  WARNING: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  URGENT: <Bell className="h-5 w-5 text-red-500" />,
};

const scopeColor: Record<string, string> = {
  ALL: 'bg-purple-100 text-purple-800',
  BUILDING: 'bg-indigo-100 text-indigo-800',
  HOSTEL: 'bg-teal-100 text-teal-800',
};

export default function NoticesPage() {
  const { hasRole } = useAuth();
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
    } catch (e: any) { alert(e.message); }
  };

  const viewDetail = async (id: string) => {
    const r = await api.get<any>(`/notices/${id}`);
    setShowDetail(r.data);
    // mark as read
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
    } catch (e: any) { alert(e.message); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
          <p className="text-sm text-gray-500 mt-1">Announcements and circulars</p>
        </div>
        {canPublish && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Publish Notice</Button>}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="Active" value={stats.active} icon={<Megaphone className="h-5 w-5 text-green-600" />} />
          <StatCard title="Total" value={stats.total} icon={<Megaphone className="h-5 w-5 text-gray-600" />} />
          <StatCard title="Expired" value={stats.expired} icon={<Megaphone className="h-5 w-5 text-red-600" />} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search notices…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Priorities</option>
          {NOTICE_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={scopeFilter} onChange={(e) => { setScopeFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Scopes</option>
          {NOTICE_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : notices.length === 0 ? <EmptyState title="No notices" description="No notices published yet" /> : (
        <div className="space-y-3">
          {notices.map((n: any) => (
            <div key={n.id} onClick={() => viewDetail(n.id)} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-3">
                {priorityIcon[n.priority] || <Megaphone className="h-5 w-5 text-gray-400 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">{n.title}</h3>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge className={priorityColor[n.priority]}>{n.priority}</Badge>
                      <Badge className={scopeColor[n.scope]}>{n.scope}{n.targetHostel ? `: ${n.targetHostel.name}` : n.targetBuilding ? `: ${n.targetBuilding.name}` : ''}</Badge>
                      {!n.isActive && <Badge className="bg-gray-200 text-gray-600">Inactive</Badge>}
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
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Publish Modal */}
      {canPublish && (
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Publish Notice">
          <div className="space-y-4">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea placeholder="Body (supports full text)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={5} />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                {NOTICE_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
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
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Notice Details">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{showDetail.title}</h3>
              <div className="flex gap-2">
                <Badge className={priorityColor[showDetail.priority]}>{showDetail.priority}</Badge>
                <Badge className={scopeColor[showDetail.scope]}>{showDetail.scope}</Badge>
              </div>
            </div>
            <div className="prose prose-sm max-w-none bg-gray-50 rounded p-4">{showDetail.body}</div>
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
