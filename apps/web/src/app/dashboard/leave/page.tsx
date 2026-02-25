'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { LEAVE_TYPES, LEAVE_STATUSES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  CalendarOff, Plus, Search, Clock, CheckCircle2, XCircle, Shield, UserCheck,
} from 'lucide-react';

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PARENT_APPROVED: 'bg-blue-100 text-blue-800',
  WARDEN_APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const typeColor: Record<string, string> = {
  HOME: 'bg-indigo-100 text-indigo-800',
  MEDICAL: 'bg-rose-100 text-rose-800',
  EMERGENCY: 'bg-orange-100 text-orange-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

export default function LeavePage() {
  const { hasRole } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState({ studentId: '', hostelId: '', type: 'HOME', fromDate: '', toDate: '', reason: '' });

  const canManage = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const [leaveRes, statsRes] = await Promise.all([
        api.get<any>(`/leave?${params}`),
        canManage ? api.get<any>('/leave/stats') : Promise.resolve(null),
      ]);
      setLeaves(leaveRes.data || []);
      setTotalPages(leaveRes.meta?.totalPages || 1);
      if (statsRes) setStats(statsRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, statusFilter, typeFilter, canManage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      await api.post<any>('/leave', form);
      setShowCreate(false);
      setForm({ studentId: '', hostelId: '', type: 'HOME', fromDate: '', toDate: '', reason: '' });
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const handleAction = async (id: string, action: string, body?: any) => {
    try {
      await api.post<any>(`/leave/${id}/${action}`, body || {});
      if (showDetail) {
        const r = await api.get<any>(`/leave/${id}`);
        setShowDetail(r.data);
      }
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const viewDetail = async (id: string) => {
    const r = await api.get<any>(`/leave/${id}`);
    setShowDetail(r.data);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage student leave requests</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Request</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Pending" value={stats.pending} icon={<Clock className="h-5 w-5 text-yellow-600" />} />
          <StatCard title="Parent Approved" value={stats.parentApproved} icon={<UserCheck className="h-5 w-5 text-blue-600" />} />
          <StatCard title="Approved" value={stats.wardenApproved} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
          <StatCard title="Rejected" value={stats.rejected} icon={<XCircle className="h-5 w-5 text-red-600" />} />
          <StatCard title="Cancelled" value={stats.cancelled} icon={<CalendarOff className="h-5 w-5 text-gray-600" />} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by name, USN…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {LEAVE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Types</option>
          {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : leaves.length === 0 ? <EmptyState title="No leave requests" description="No requests match" /> : (
        <div className="space-y-3">
          {leaves.map((l: any) => (
            <div key={l.id} onClick={() => viewDetail(l.id)} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarOff className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{l.student?.firstName} {l.student?.lastName}</p>
                    <p className="text-xs text-gray-500">{l.student?.usn || l.student?.email} • {l.hostel?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={typeColor[l.type] || ''}>{l.type}</Badge>
                  <Badge className={statusColor[l.status] || ''}>{LEAVE_STATUSES.find(s => s.value === l.status)?.label || l.status}</Badge>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span>{fmtDate(l.fromDate)} → {fmtDate(l.toDate)}</span>
                <span className="truncate max-w-[300px]">{l.reason}</span>
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Leave Request">
        <div className="space-y-4">
          <Input placeholder="Student User ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
          <Input placeholder="Hostel ID" value={form.hostelId} onChange={(e) => setForm({ ...form, hostelId: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">From</label><Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">To</label><Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></div>
          </div>
          <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3} />
          <Button onClick={handleCreate} className="w-full">Submit Request</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Leave Request Details">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">USN</span><p className="font-medium">{showDetail.student?.usn || '—'}</p></div>
              <div><span className="text-gray-500">Type</span><p><Badge className={typeColor[showDetail.type]}>{showDetail.type}</Badge></p></div>
              <div><span className="text-gray-500">Status</span><p><Badge className={statusColor[showDetail.status]}>{LEAVE_STATUSES.find(s => s.value === showDetail.status)?.label}</Badge></p></div>
              <div><span className="text-gray-500">From</span><p className="font-medium">{fmtDate(showDetail.fromDate)}</p></div>
              <div><span className="text-gray-500">To</span><p className="font-medium">{fmtDate(showDetail.toDate)}</p></div>
            </div>
            <div><span className="text-sm text-gray-500">Reason</span><p className="text-sm bg-gray-50 rounded p-2 mt-1">{showDetail.reason}</p></div>
            {showDetail.rejectionReason && <div><span className="text-sm text-red-500">Rejection Reason</span><p className="text-sm bg-red-50 rounded p-2 mt-1">{showDetail.rejectionReason}</p></div>}
            {showDetail.warden && <div className="text-sm"><span className="text-gray-500">Warden:</span> {showDetail.warden.firstName} {showDetail.warden.lastName}</div>}
            {showDetail.parent && <div className="text-sm"><span className="text-gray-500">Parent:</span> {showDetail.parent.firstName} {showDetail.parent.lastName}</div>}

            {canManage && showDetail.status === 'PENDING' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleAction(showDetail.id, 'warden-approve')} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
                <Button onClick={() => { const r = prompt('Rejection reason:'); if (r) handleAction(showDetail.id, 'reject', { rejectionReason: r }); }} className="flex-1 bg-red-600 hover:bg-red-700"><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
              </div>
            )}
            {canManage && showDetail.status === 'PARENT_APPROVED' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleAction(showDetail.id, 'warden-approve')} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-4 w-4 mr-1" /> Warden Approve</Button>
                <Button onClick={() => { const r = prompt('Rejection reason:'); if (r) handleAction(showDetail.id, 'reject', { rejectionReason: r }); }} className="flex-1 bg-red-600 hover:bg-red-700"><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
