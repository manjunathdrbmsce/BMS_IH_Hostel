'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES, COMPLAINT_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import {
  MessageSquareWarning, Plus, Search, AlertCircle, Clock, CheckCircle2, Wrench, Send,
} from 'lucide-react';

const statusBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  OPEN: 'danger',
  ASSIGNED: 'info',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
  REOPENED: 'danger',
};

const priorityBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

export default function ComplaintsPage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ studentId: '', hostelId: '', category: 'MAINTENANCE', subject: '', description: '', priority: 'MEDIUM' });

  const isStudent = hasRole('STUDENT');
  const canManage = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const [listRes, statsRes] = await Promise.all([
        api.get<any>(`/complaints?${params}`),
        canManage ? api.get<any>('/complaints/stats') : Promise.resolve(null),
      ]);
      setComplaints(listRes.data || []);
      setTotalPages(listRes.meta?.totalPages || 1);
      if (statsRes) setStats(statsRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, statusFilter, categoryFilter, canManage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      await api.post<any>('/complaints', form);
      setShowCreate(false);
      setForm({ studentId: '', hostelId: '', category: 'MAINTENANCE', subject: '', description: '', priority: 'MEDIUM' });
      fetchData();
      addToast({ type: 'success', title: 'Complaint filed successfully' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to file complaint' });
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await api.patch<any>(`/complaints/${id}`, data);
      const r = await api.get<any>(`/complaints/${id}`);
      setShowDetail(r.data);
      fetchData();
      addToast({ type: 'success', title: 'Complaint updated' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to update' });
    }
  };

  const handleComment = async (id: string) => {
    if (!comment.trim()) return;
    try {
      await api.post<any>(`/complaints/${id}/comments`, { message: comment });
      const r = await api.get<any>(`/complaints/${id}`);
      setShowDetail(r.data);
      setComment('');
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to add comment' });
    }
  };

  const viewDetail = async (id: string) => {
    const r = await api.get<any>(`/complaints/${id}`);
    setShowDetail(r.data);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014';

  return (
    <div className="min-h-screen">
      <Topbar title="Complaints" subtitle={isStudent ? 'Your complaints and resolution status' : 'Student complaints and resolution tracking'}>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> File Complaint</Button>
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && canManage ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard title="Open" value={stats.open} icon={AlertCircle} iconColor="text-red-600" iconBg="bg-red-50" />
              <StatCard title="In Progress" value={stats.inProgress} icon={Wrench} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" />
              <StatCard title="Total" value={stats.total} icon={MessageSquareWarning} iconColor="text-gray-600" iconBg="bg-gray-50" />
            </>
          ) : null}
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search complaints\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Statuses</option>
              {COMPLAINT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Categories</option>
              {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></Card>
        ) : complaints.length === 0 ? (
          <EmptyState title="No complaints" description="No complaints match the filters" />
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-gray-100">
              {complaints.map((c: any) => (
                <div key={c.id} onClick={() => viewDetail(c.id)} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <MessageSquareWarning className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.subject}</p>
                      <p className="text-xs text-gray-500">{c.student?.firstName} {c.student?.lastName} \u2022 {c.hostel?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={priorityBadge[c.priority] || 'default'}>{c.priority}</Badge>
                    <Badge variant={statusBadge[c.status] || 'default'}>{COMPLAINT_STATUSES.find(s => s.value === c.status)?.label || c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="File a Complaint" size="lg">
        <div className="space-y-4">
          <Input placeholder="Student User ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
          <Input placeholder="Hostel ID" value={form.hostelId} onChange={(e) => setForm({ ...form, hostelId: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            {COMPLAINT_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" rows={4} />
          <Button onClick={handleCreate} className="w-full">Submit Complaint</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Complaint Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{showDetail.subject}</h3>
              <div className="flex gap-2">
                <Badge variant={priorityBadge[showDetail.priority] || 'default'}>{showDetail.priority}</Badge>
                <Badge variant={statusBadge[showDetail.status] || 'default'}>{COMPLAINT_STATUSES.find(s => s.value === showDetail.status)?.label}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">Category</span><p className="font-medium">{COMPLAINT_CATEGORIES.find(c => c.value === showDetail.category)?.label}</p></div>
              <div><span className="text-gray-500">Hostel</span><p className="font-medium">{showDetail.hostel?.name}</p></div>
              <div><span className="text-gray-500">Filed</span><p className="font-medium">{fmtDate(showDetail.createdAt)}</p></div>
              {showDetail.assignedTo && <div><span className="text-gray-500">Assigned To</span><p className="font-medium">{showDetail.assignedTo.firstName} {showDetail.assignedTo.lastName}</p></div>}
              {showDetail.resolvedAt && <div><span className="text-gray-500">Resolved</span><p className="font-medium">{fmtDate(showDetail.resolvedAt)}</p></div>}
            </div>
            <div><span className="text-sm text-gray-500">Description</span><p className="text-sm bg-gray-50 rounded-lg p-3 mt-1">{showDetail.description}</p></div>
            {showDetail.resolution && <div><span className="text-sm text-green-600">Resolution</span><p className="text-sm bg-green-50 rounded-lg p-3 mt-1">{showDetail.resolution}</p></div>}
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Comments ({showDetail.comments?.length || 0})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {showDetail.comments?.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-2 text-sm">
                    <span className="font-medium">{c.user?.firstName} {c.user?.lastName}</span>
                    <span className="text-gray-400 ml-2 text-xs">{fmtDate(c.createdAt)}</span>
                    <p className="mt-1">{c.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Add a comment\u2026" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button onClick={() => handleComment(showDetail.id)} size="sm"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
            {canManage && !['RESOLVED', 'CLOSED'].includes(showDetail.status) && (
              <div className="flex gap-2 pt-2 border-t">
                {showDetail.status === 'OPEN' && (
                  <Button onClick={() => { const id = prompt('Assign to staff user ID:'); if (id) handleUpdate(showDetail.id, { assignedToId: id }); }} variant="outline" size="sm"><Wrench className="h-4 w-4 mr-1" /> Assign</Button>
                )}
                <Button onClick={() => handleUpdate(showDetail.id, { status: 'IN_PROGRESS' })} variant="outline" size="sm"><Clock className="h-4 w-4 mr-1" /> In Progress</Button>
                <Button onClick={() => { const r = prompt('Resolution:'); if (r) handleUpdate(showDetail.id, { status: 'RESOLVED', resolution: r }); }} variant="primary" size="sm"><CheckCircle2 className="h-4 w-4 mr-1" /> Resolve</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}