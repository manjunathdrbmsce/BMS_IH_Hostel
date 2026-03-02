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
  CalendarOff, Plus, Search, Clock, CheckCircle2, XCircle, UserCheck, Upload, FileText, Ban,
} from 'lucide-react';

const statusBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  PENDING: 'info',
  PARENT_APPROVED: 'info',
  PARENT_REJECTED: 'danger',
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
  const { user, hasRole } = useAuth();
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

  // Form state
  const [form, setForm] = useState({ type: 'HOME', fromDate: '', toDate: '', reason: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Eligibility state (from backend)
  const [eligibility, setEligibility] = useState<any>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  const isStudent = hasRole('STUDENT');
  const isParent = hasRole('PARENT');
  const canManage = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  // Fetch eligibility when form opens
  useEffect(() => {
    if (!showCreate || !user) return;
    setEligibilityLoading(true);
    api.get<any>('/leave/eligibility')
      .then((res) => setEligibility(res.data))
      .catch((err) => {
        console.error('Eligibility check failed:', err);
        setEligibility({ eligible: false, reason: 'Failed to check eligibility. Please try again.' });
      })
      .finally(() => setEligibilityLoading(false));
  }, [showCreate, user]);

  // Handle proof file selection
  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      if (file.type.startsWith('image/')) {
        setProofPreview(URL.createObjectURL(file));
      } else {
        setProofPreview(null);
      }
    }
  };

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
    if (!eligibility?.eligible) {
      addToast({ type: 'error', title: eligibility?.reason || 'Not eligible to apply for leave' });
      return;
    }
    setSubmitting(true);
    try {
      // Upload proof if provided
      let proofUrl: string | undefined;
      if (proofFile) {
        const uploadRes = await api.upload<any>('/uploads/document', proofFile, 'file');
        proofUrl = uploadRes.data?.url || uploadRes.data?.path;
      }

      await api.post<any>('/leave', {
        studentId: eligibility.student.id,
        hostelId: eligibility.hostel.id,
        type: form.type,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason,
        proofUrl,
      });
      setShowCreate(false);
      setForm({ type: 'HOME', fromDate: '', toDate: '', reason: '' });
      setProofFile(null);
      setProofPreview(null);
      setEligibility(null);
      fetchData();
      addToast({ type: 'success', title: 'Leave request submitted! Parent has been notified via WhatsApp.' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to submit' });
    }
    setSubmitting(false);
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

      {/* ── Create Modal ── */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setProofFile(null); setProofPreview(null); setEligibility(null); }} title="New Leave Request" size="lg">
        {eligibilityLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-gray-500">Checking leave eligibility...</p>
          </div>
        ) : eligibility && !eligibility.eligible ? (
          /* ── Ineligible State ── */
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cannot Apply for Leave</h3>
              <p className="text-sm text-gray-600 max-w-md">{eligibility.reason}</p>
            </div>
            {eligibility.student && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                <span className="text-gray-500">Student:</span> <span className="font-medium">{eligibility.student.name}</span>
              </div>
            )}
            <Button onClick={() => setShowCreate(false)} variant="secondary" className="w-full">Close</Button>
          </div>
        ) : eligibility?.eligible ? (
          /* ── Eligible — Show Form ── */
          <div className="space-y-4">
            {/* Student & Hostel Info (read-only, auto-filled) */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Student Information</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-gray-500">Name</span><p className="font-semibold text-gray-900">{eligibility.student.name}</p></div>
                {eligibility.student.usn && <div><span className="text-gray-500">USN</span><p className="font-semibold text-gray-900">{eligibility.student.usn}</p></div>}
                <div><span className="text-gray-500">Hostel</span><p className="font-semibold text-gray-900">{eligibility.hostel.name} ({eligibility.hostel.code})</p></div>
                {eligibility.room && <div><span className="text-gray-500">Room / Bed</span><p className="font-semibold text-gray-900">{eligibility.room.number} / {eligibility.bed?.number || '\u2014'} (Floor {eligibility.room.floor})</p></div>}
              </div>
              {eligibility.guardians?.length > 0 && (
                <div className="mt-1 pt-2 border-t border-indigo-100">
                  <span className="text-xs text-gray-500">Guardian(s):</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {eligibility.guardians.map((g: any) => (
                      <span key={g.id} className="inline-flex items-center gap-1 text-xs bg-white rounded-full px-2.5 py-1 border border-gray-200">
                        {g.name} {g.relation ? `(${g.relation})` : ''} {g.hasWhatsApp ? '📱' : '⚠️'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {eligibility.warnings?.length > 0 && (
              <div className="space-y-1.5">
                {eligibility.warnings.map((w: string, i: number) => (
                  <div key={i} className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠️</span> {w}
                  </div>
                ))}
              </div>
            )}

            {/* Leave Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Leave Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">From Date</label><Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">To Date</label><Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
              <textarea
                placeholder="Please describe the reason for your leave request..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Proof Upload */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proof / Attachment (Optional)</label>
              <div className="relative">
                <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleProofChange} className="hidden" id="proof-upload" />
                <label htmlFor="proof-upload" className="flex items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{proofFile ? proofFile.name : 'Click to upload proof'}</p>
                    <p className="text-xs text-gray-400">Supports: Images, PDF, DOC (Max 5MB)</p>
                  </div>
                </label>
                {proofPreview && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                    <img src={proofPreview} alt="Proof preview" className="max-h-32 w-auto object-contain mx-auto" />
                  </div>
                )}
                {proofFile && !proofPreview && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    <FileText className="h-4 w-4" />
                    <span>{proofFile.name}</span>
                    <button onClick={() => { setProofFile(null); setProofPreview(null); }} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
                  </div>
                )}
              </div>
            </div>

            {/* Info note */}
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2.5 text-xs text-indigo-700">
              <strong>Approval Flow:</strong> After submission → Parent approval via WhatsApp → Warden approval → Leave sanctioned
            </div>

            <Button onClick={handleCreate} disabled={submitting || !form.fromDate || !form.toDate || !form.reason || !!eligibility.activeLeave} className="w-full">
              {submitting ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </div>
        ) : null}
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Leave Request Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">USN</span><p className="font-medium">{showDetail.student?.usn || '\u2014'}</p></div>
              <div><span className="text-gray-500">Hostel</span><p className="font-medium">{showDetail.hostel?.name || '\u2014'} {showDetail.hostel?.code ? `(${showDetail.hostel.code})` : ''}</p></div>
              <div><span className="text-gray-500">Type</span><p><Badge variant={typeBadge[showDetail.type] || 'default'}>{showDetail.type}</Badge></p></div>
              <div><span className="text-gray-500">Status</span><p><Badge variant={statusBadge[showDetail.status] || 'default'}>{LEAVE_STATUSES.find(s => s.value === showDetail.status)?.label || showDetail.status}</Badge></p></div>
              <div><span className="text-gray-500">Applied</span><p className="font-medium">{fmtDate(showDetail.createdAt)}</p></div>
              <div><span className="text-gray-500">From</span><p className="font-medium">{fmtDate(showDetail.fromDate)}</p></div>
              <div><span className="text-gray-500">To</span><p className="font-medium">{fmtDate(showDetail.toDate)}</p></div>
            </div>
            <div><span className="text-sm text-gray-500">Reason</span><p className="text-sm bg-gray-50 rounded-lg p-3 mt-1">{showDetail.reason}</p></div>

            {/* Proof attachment */}
            {showDetail.proofUrl && (
              <div>
                <span className="text-sm text-gray-500">Proof Attachment</span>
                <a href={showDetail.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-1 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg px-3 py-2">
                  <FileText className="h-4 w-4" /> View Attachment
                </a>
              </div>
            )}

            {showDetail.rejectionReason && <div><span className="text-sm text-red-500">Rejection Reason</span><p className="text-sm bg-red-50 rounded-lg p-3 mt-1">{showDetail.rejectionReason}</p></div>}
            {showDetail.warden && <div className="text-sm"><span className="text-gray-500">Warden:</span> {showDetail.warden.firstName} {showDetail.warden.lastName}</div>}
            {showDetail.parent && <div className="text-sm"><span className="text-gray-500">Parent:</span> {showDetail.parent.firstName} {showDetail.parent.lastName}</div>}
            {showDetail.parentApprovalAt && <div className="text-sm"><span className="text-gray-500">Parent Approved:</span> {fmtDate(showDetail.parentApprovalAt)}</div>}
            {showDetail.wardenApprovalAt && <div className="text-sm"><span className="text-gray-500">Warden Approved:</span> {fmtDate(showDetail.wardenApprovalAt)}</div>}

            {/* Status-specific info notes */}
            {showDetail.status === 'PENDING' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ⏳ Awaiting parent approval — Parent can approve via WhatsApp reply or from this dashboard
              </div>
            )}
            {showDetail.status === 'PARENT_REJECTED' && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
                <Ban className="h-4 w-4" /> Parent has rejected this leave request
              </div>
            )}
            {showDetail.status === 'PARENT_APPROVED' && !showDetail.wardenApprovalAt && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                ✅ Parent approved — Awaiting warden approval
              </div>
            )}

            {/* PENDING: Parent-level approval — for Parent role OR Admin/Warden override */}
            {showDetail.status === 'PENDING' && (isParent || canManage) && (
              <div className="space-y-2 pt-2 border-t">
                {canManage && !isParent && (
                  <p className="text-xs text-gray-500 italic">Admin/Warden: Approve on behalf of parent</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => handleAction(showDetail.id, 'parent-approve')} variant="primary" className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" /> Parent Approve</Button>
                  <Button onClick={() => handleAction(showDetail.id, 'parent-reject')} variant="danger" className="flex-1"><XCircle className="h-4 w-4 mr-1" /> Parent Reject</Button>
                </div>
              </div>
            )}

            {/* PARENT_APPROVED: Warden approval */}
            {canManage && showDetail.status === 'PARENT_APPROVED' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleAction(showDetail.id, 'warden-approve')} variant="primary" className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" /> Warden Approve</Button>
                <Button onClick={() => { const r = prompt('Rejection reason:'); if (r) handleAction(showDetail.id, 'reject', { rejectionReason: r }); }} variant="danger" className="flex-1"><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
              </div>
            )}

            {/* Student cancel */}
            {isStudent && ['PENDING', 'PARENT_APPROVED'].includes(showDetail.status) && (
              <div className="pt-2 border-t">
                <Button onClick={() => handleAction(showDetail.id, 'cancel')} variant="danger" className="w-full"><XCircle className="h-4 w-4 mr-1" /> Cancel Request</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}