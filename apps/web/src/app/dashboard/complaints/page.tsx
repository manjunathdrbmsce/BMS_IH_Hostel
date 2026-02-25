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
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  MessageSquareWarning, Plus, Search, AlertCircle, Clock, CheckCircle2, Wrench, Send,
} from 'lucide-react';

const statusColor: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  ASSIGNED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  REOPENED: 'bg-orange-100 text-orange-800',
};

const priorityColor: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-800',
};

export default function ComplaintsPage() {
  const { hasRole } = useAuth();
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
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await api.patch<any>(`/complaints/${id}`, data);
      const r = await api.get<any>(`/complaints/${id}`);
      setShowDetail(r.data);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const handleComment = async (id: string) => {
    if (!comment.trim()) return;
    try {
      await api.post<any>(`/complaints/${id}/comments`, { message: comment });
      const r = await api.get<any>(`/complaints/${id}`);
      setShowDetail(r.data);
      setComment('');
    } catch (e: any) { alert(e.message); }
  };

  const viewDetail = async (id: string) => {
    const r = await api.get<any>(`/complaints/${id}`);
    setShowDetail(r.data);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-sm text-gray-500 mt-1">Student complaints and resolution tracking</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> File Complaint</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Open" value={stats.open} icon={<AlertCircle className="h-5 w-5 text-red-600" />} />
          <StatCard title="In Progress" value={stats.inProgress} icon={<Wrench className="h-5 w-5 text-blue-600" />} />
          <StatCard title="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
          <StatCard title="Total" value={stats.total} icon={<MessageSquareWarning className="h-5 w-5 text-gray-600" />} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search complaints…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {COMPLAINT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : complaints.length === 0 ? <EmptyState title="No complaints" description="No complaints match the filters" /> : (
        <div className="space-y-3">
          {complaints.map((c: any) => (
            <div key={c.id} onClick={() => viewDetail(c.id)} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquareWarning className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{c.subject}</p>
                    <p className="text-xs text-gray-500">{c.student?.firstName} {c.student?.lastName} • {c.hostel?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={priorityColor[c.priority] || ''}>{c.priority}</Badge>
                  <Badge className={statusColor[c.status] || ''}>{COMPLAINT_STATUSES.find(s => s.value === c.status)?.label || c.status}</Badge>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{COMPLAINT_CATEGORIES.find(cat => cat.value === c.category)?.label || c.category}</span>
                {c.assignedTo && <span>→ {c.assignedTo.firstName} {c.assignedTo.lastName}</span>}
                <span>{c._count?.comments || 0} comments</span>
                <span>{fmtDate(c.createdAt)}</span>
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="File a Complaint">
        <div className="space-y-4">
          <Input placeholder="Student User ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
          <Input placeholder="Hostel ID" value={form.hostelId} onChange={(e) => setForm({ ...form, hostelId: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            {COMPLAINT_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={4} />
          <Button onClick={handleCreate} className="w-full">Submit Complaint</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Complaint Details">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{showDetail.subject}</h3>
              <div className="flex gap-2">
                <Badge className={priorityColor[showDetail.priority]}>{showDetail.priority}</Badge>
                <Badge className={statusColor[showDetail.status]}>{COMPLAINT_STATUSES.find(s => s.value === showDetail.status)?.label}</Badge>
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
            <div><span className="text-sm text-gray-500">Description</span><p className="text-sm bg-gray-50 rounded p-3 mt-1">{showDetail.description}</p></div>
            {showDetail.resolution && <div><span className="text-sm text-green-600">Resolution</span><p className="text-sm bg-green-50 rounded p-3 mt-1">{showDetail.resolution}</p></div>}

            {/* Comments */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Comments ({showDetail.comments?.length || 0})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {showDetail.comments?.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded p-2 text-sm">
                    <span className="font-medium">{c.user?.firstName} {c.user?.lastName}</span>
                    <span className="text-gray-400 ml-2 text-xs">{fmtDate(c.createdAt)}</span>
                    <p className="mt-1">{c.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button onClick={() => handleComment(showDetail.id)} size="sm"><Send className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Actions */}
            {canManage && !['RESOLVED', 'CLOSED'].includes(showDetail.status) && (
              <div className="flex gap-2 pt-2 border-t">
                {showDetail.status === 'OPEN' && (
                  <Button onClick={() => { const id = prompt('Assign to staff user ID:'); if (id) handleUpdate(showDetail.id, { assignedToId: id }); }} variant="outline" size="sm"><Wrench className="h-4 w-4 mr-1" /> Assign</Button>
                )}
                <Button onClick={() => handleUpdate(showDetail.id, { status: 'IN_PROGRESS' })} variant="outline" size="sm"><Clock className="h-4 w-4 mr-1" /> In Progress</Button>
                <Button onClick={() => { const r = prompt('Resolution:'); if (r) handleUpdate(showDetail.id, { status: 'RESOLVED', resolution: r }); }} className="bg-green-600 hover:bg-green-700" size="sm"><CheckCircle2 className="h-4 w-4 mr-1" /> Resolve</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
