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
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import {
  CalendarOff, Plus, Search, Clock, CheckCircle2, XCircle, UserCheck,
} from 'lucide-react';

const statusBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  PENDING: 'info',
  PARENT_APPROVED: 'info',
  WARDEN_APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'default',
};

const typeBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  HOME: 'info',
  MEDICAL: 'danger',
  EMERGENCY: 'danger',
  OTHER: 'default',
};

export default function LeavePage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
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

  const isStudent = hasRole('STUDENT');
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
      addToast({ type: 'success', title: 'Leave request submitted' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to submit' });
    }
  };

  const handleAction = async (id: string, action: string, body?: any) => {
    try {
      await api.post<any>(`/leave/${id}/${action}`, body || {});
      if (showDetail) {
        const r = await api.get<any>(`/leave/${id}`);
        setShowDetail(r.data);
      }
      fetchData();
      addToast({ type: 'success', title: `Leave ${action.replace('-', ' ')}` });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Action failed' });
    }
  };

  const viewDetail = async (id: string) => {
    const r = await api.get<any>(`/leave/${id}`);
    setShowDetail(r.data);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

  return (
    <div className="min-h-screen">
      <Topbar title="Leave Management" subtitle={isStudent ? 'Your leave requests' : 'Track and manage student leave requests'}>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Request</Button>
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {loading && canManage ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard title="Pending" value={stats.pending} icon={Clock} iconColor="text-yellow-600" iconBg="bg-yellow-50" />
              <StatCard title="Parent Approved" value={stats.parentApproved} icon={UserCheck} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatCard title="Approved" value={stats.wardenApproved} icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" />
              <StatCard title="Rejected" value={stats.rejected} icon={XCircle} iconColor="text-red-600" iconBg="bg-red-50" />
              <StatCard title="Cancelled" value={stats.cancelled} icon={CalendarOff} iconColor="text-gray-600" iconBg="bg-gray-50" />
            </>
          ) : null}
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, USN\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Statuses</option>
              {LEAVE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Types</option>
              {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></Card>
        ) : leaves.length === 0 ? (
          <EmptyState title="No leave requests" description="No requests match the current filters" />
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-gray-100">
              {leaves.map((l: any) => (
                <div key={l.id} onClick={() => viewDetail(l.id)} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <CalendarOff className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{l.student?.firstName} {l.student?.lastName}</p>
                      <p className="text-xs text-gray-500">{fmtDate(l.fromDate)} \u2192 {fmtDate(l.toDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={typeBadge[l.type] || 'default'}>{l.type}</Badge>
                    <Badge variant={statusBadge[l.status] || 'default'}>{LEAVE_STATUSES.find(s => s.value === l.status)?.label || l.status}</Badge>
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
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Leave Request" size="lg">
        <div className="space-y-4">
          <Input placeholder="Student User ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
          <Input placeholder="Hostel ID" value={form.hostelId} onChange={(e) => setForm({ ...form, hostelId: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">From</label><Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">To</label><Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></div>
          </div>
          <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" rows={3} />
          <Button onClick={handleCreate} className="w-full">Submit Request</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Leave Request Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">USN</span><p className="font-medium">{showDetail.student?.usn || '\u2014'}</p></div>
              <div><span className="text-gray-500">Type</span><p><Badge variant={typeBadge[showDetail.type] || 'default'}>{showDetail.type}</Badge></p></div>
              <div><span className="text-gray-500">Status</span><p><Badge variant={statusBadge[showDetail.status] || 'default'}>{LEAVE_STATUSES.find(s => s.value === showDetail.status)?.label}</Badge></p></div>
              <div><span className="text-gray-500">From</span><p className="font-medium">{fmtDate(showDetail.fromDate)}</p></div>
              <div><span className="text-gray-500">To</span><p className="font-medium">{fmtDate(showDetail.toDate)}</p></div>
            </div>
            <div><span className="text-sm text-gray-500">Reason</span><p className="text-sm bg-gray-50 rounded-lg p-3 mt-1">{showDetail.reason}</p></div>
            {showDetail.rejectionReason && <div><span className="text-sm text-red-500">Rejection Reason</span><p className="text-sm bg-red-50 rounded-lg p-3 mt-1">{showDetail.rejectionReason}</p></div>}
            {showDetail.warden && <div className="text-sm"><span className="text-gray-500">Warden:</span> {showDetail.warden.firstName} {showDetail.warden.lastName}</div>}
            {showDetail.parent && <div className="text-sm"><span className="text-gray-500">Parent:</span> {showDetail.parent.firstName} {showDetail.parent.lastName}</div>}
            {canManage && showDetail.status === 'PENDING' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleAction(showDetail.id, 'warden-approve')} variant="primary" className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
                <Button onClick={() => { const r = prompt('Rejection reason:'); if (r) handleAction(showDetail.id, 'reject', { rejectionReason: r }); }} variant="danger" className="flex-1"><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
              </div>
            )}
            {canManage && showDetail.status === 'PARENT_APPROVED' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleAction(showDetail.id, 'warden-approve')} variant="primary" className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" /> Warden Approve</Button>
                <Button onClick={() => { const r = prompt('Rejection reason:'); if (r) handleAction(showDetail.id, 'reject', { rejectionReason: r }); }} variant="danger" className="flex-1"><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}