'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { REBATE_STATUSES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { CheckCircle2, XCircle, Clock, IndianRupee } from 'lucide-react';

const statusBadgeVariant: Record<string, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export default function RebatesPage() {
  const { addToast } = useToast();
  const [rebates, setRebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewModal, setReviewModal] = useState<{ rebate: any; action: 'approve' | 'reject' } | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<any>(`/mess/rebates?${params}`);
      setRebates(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const { rebate, action } = reviewModal;
      if (action === 'approve') {
        await api.post(`/mess/rebates/${rebate.id}/approve`, {
          amount: parseFloat(amount),
          notes: notes || undefined,
        });
        addToast({ type: 'success', title: `Rebate Approved: ₹${amount}` });
      } else {
        await api.post(`/mess/rebates/${rebate.id}/reject`, {
          notes: notes || undefined,
        });
        addToast({ type: 'success', title: 'Rebate Rejected' });
      }
      setReviewModal(null);
      setAmount('');
      setNotes('');
      fetchData();
    } catch (e: any) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Failed' });
    }
    setSubmitting(false);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen">
      <Topbar title="Rebates" subtitle="Manage mess rebate requests" />

      <div className="p-6 space-y-6 animate-in">
        <Card>
          <div className="flex gap-3 flex-wrap">
            {[{ label: 'All', value: '' }, ...REBATE_STATUSES].map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === s.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Card>

        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></Card>
        ) : rebates.length === 0 ? (
          <EmptyState title="No rebates" description="No rebate requests found" />
        ) : (
          <div className="space-y-3">
            {rebates.map((r: any) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{r.student?.firstName} {r.student?.lastName}</h3>
                      <Badge variant={statusBadgeVariant[r.status] as any}>{r.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{r.student?.usn} · {r.hostel?.name}</p>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</span>
                      <span>{r.totalMeals} meals</span>
                      {r.amount && <span className="font-medium text-green-600">₹{r.amount}</span>}
                    </div>
                    {r.reason && <p className="text-sm text-gray-500 mt-1">{r.reason}</p>}
                    {r.leaveRequest && (
                      <p className="text-xs text-indigo-600">Linked to leave: {fmtDate(r.leaveRequest.fromDate)} — {fmtDate(r.leaveRequest.toDate)}</p>
                    )}
                  </div>
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => { setReviewModal({ rebate: r, action: 'approve' }); setAmount(String(r.totalMeals * 50)); }}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReviewModal({ rebate: r, action: 'reject' })}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {reviewModal.action === 'approve' ? 'Approve Rebate' : 'Reject Rebate'}
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{reviewModal.rebate.student?.firstName} {reviewModal.rebate.student?.lastName}</p>
                <p className="text-gray-500">{reviewModal.rebate.totalMeals} meals · {fmtDate(reviewModal.rebate.fromDate)} → {fmtDate(reviewModal.rebate.toDate)}</p>
              </div>
              {reviewModal.action === 'approve' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Rebate Amount (₹)</label>
                  <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="mt-1" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setReviewModal(null); setAmount(''); setNotes(''); }}>Cancel</Button>
              <Button
                onClick={handleReview}
                disabled={submitting || (reviewModal.action === 'approve' && !amount)}
                variant={reviewModal.action === 'reject' ? 'danger' : 'primary'}
              >
                {submitting ? 'Processing...' : reviewModal.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
