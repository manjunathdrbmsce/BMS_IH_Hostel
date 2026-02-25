'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { VIOLATION_TYPES, ESCALATION_STATES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  ShieldAlert, Search, AlertTriangle, CheckCircle, Clock, XOctagon, Scale,
} from 'lucide-react';

const typeIcon: Record<string, React.ReactNode> = {
  LATE_ENTRY: <Clock className="h-5 w-5 text-red-500" />,
  OVERSTAY: <XOctagon className="h-5 w-5 text-orange-500" />,
  EARLY_EXIT: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
};

const escalationColor: Record<string, string> = {
  NONE: 'bg-gray-100 text-gray-800',
  WARNED: 'bg-yellow-100 text-yellow-800',
  ESCALATED: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
};

export default function ViolationsPage() {
  const { hasRole } = useAuth();
  const [violations, setViolations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [escalationFilter, setEscalationFilter] = useState('');
  const [showDetail, setShowDetail] = useState<any>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const canResolve = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (escalationFilter) params.set('escalationState', escalationFilter);
      const res = await api.get<any>(`/violations?${params}`);
      setViolations(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);

      if (canResolve) {
        const statsRes = await api.get<any>('/violations/stats');
        setStats(statsRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, search, typeFilter, escalationFilter, canResolve]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const viewDetail = async (id: string) => {
    try {
      const r = await api.get<any>(`/violations/${id}`);
      setShowDetail(r.data);
    } catch (e: any) { alert(e.message); }
  };

  const handleResolve = async () => {
    if (!showDetail) return;
    try {
      await api.patch<any>(`/violations/${showDetail.id}/resolve`, { notes: resolveNotes });
      setResolveNotes('');
      const r = await api.get<any>(`/violations/${showDetail.id}`);
      setShowDetail(r.data);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Violations</h1>
          <p className="text-sm text-gray-500 mt-1">Curfew violations, overstays, and escalations</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Today" value={stats.todayViolations} icon={<ShieldAlert className="h-5 w-5 text-red-600" />} />
          <StatCard title="This Week" value={stats.weekViolations} icon={<AlertTriangle className="h-5 w-5 text-orange-600" />} />
          <StatCard title="Open Escalations" value={stats.openEscalations} icon={<Scale className="h-5 w-5 text-red-400" />} />
          <StatCard title="Resolved (Week)" value={stats.resolvedThisWeek} icon={<CheckCircle className="h-5 w-5 text-green-600" />} />
          <StatCard title="Total" value={stats.totalViolations} icon={<XOctagon className="h-5 w-5 text-gray-600" />} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search student…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All Types</option>
          {VIOLATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={escalationFilter} onChange={(e) => { setEscalationFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All States</option>
          {ESCALATION_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        violations.length === 0 ? <EmptyState title="No violations" description="No violations found" /> : (
          <div className="space-y-3">
            {violations.map((v: any) => (
              <div key={v.id} onClick={() => viewDetail(v.id)} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {typeIcon[v.type] || <ShieldAlert className="h-5 w-5 text-gray-400" />}
                    <div>
                      <p className="font-medium text-gray-900">{v.student?.firstName} {v.student?.lastName}</p>
                      <p className="text-xs text-gray-500">{v.student?.usn || v.student?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800">{VIOLATION_TYPES.find(t => t.value === v.type)?.label || v.type}</Badge>
                    <Badge className={escalationColor[v.escalationState] || ''}>{ESCALATION_STATES.find(s => s.value === v.escalationState)?.label || v.escalationState}</Badge>
                    <span className="text-sm font-medium text-red-600">{v.violatedByMinutes}m late</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {fmtDate(v.createdAt)} • Gate: {v.gateEntry?.gateNo} • Repeated: {v.repeatedCountSnapshot}×
                  {v.policySnapshot && ` • Curfew: ${v.policySnapshot.curfewTimeUsed}`}
                </div>
              </div>
            ))}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )
      )}

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Violation Details">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">USN</span><p className="font-medium">{showDetail.student?.usn || '—'}</p></div>
              <div><span className="text-gray-500">Type</span><p><Badge className="bg-red-100 text-red-800">{VIOLATION_TYPES.find(t => t.value === showDetail.type)?.label || showDetail.type}</Badge></p></div>
              <div><span className="text-gray-500">Escalation</span><p><Badge className={escalationColor[showDetail.escalationState]}>{ESCALATION_STATES.find(s => s.value === showDetail.escalationState)?.label}</Badge></p></div>
              <div><span className="text-gray-500">Late By</span><p className="font-medium text-red-600">{showDetail.violatedByMinutes} minutes</p></div>
              <div><span className="text-gray-500">Repeated Count</span><p className="font-medium">{showDetail.repeatedCountSnapshot}×</p></div>
              <div><span className="text-gray-500">Expected Time</span><p className="font-medium">{fmtDate(showDetail.requestedOrApprovedTime)}</p></div>
              <div><span className="text-gray-500">Actual Time</span><p className="font-medium">{fmtDate(showDetail.actualTime)}</p></div>
              <div><span className="text-gray-500">Gate</span><p className="font-medium">{showDetail.gateEntry?.gateNo} ({showDetail.gateEntry?.type})</p></div>
              <div><span className="text-gray-500">Created</span><p className="font-medium">{fmtDate(showDetail.createdAt)}</p></div>
            </div>

            <div><span className="text-sm text-gray-500">Reason</span><p className="text-sm bg-gray-50 rounded p-2 mt-1">{showDetail.reason}</p></div>

            {showDetail.policySnapshot && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">Policy Snapshot (v{showDetail.policySnapshot.policyVersion})</p>
                <div className="grid grid-cols-2 gap-1 text-blue-700">
                  <span>Curfew: {showDetail.policySnapshot.curfewTimeUsed}</span>
                  <span>Tolerance: {showDetail.policySnapshot.toleranceMinUsed} min</span>
                  <span>Escalation Rule: {showDetail.policySnapshot.escalationRuleMin} min</span>
                </div>
              </div>
            )}

            {showDetail.resolvedAt && (
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-800">Resolved on {fmtDate(showDetail.resolvedAt)}</p>
                {showDetail.resolvedBy && <p className="text-green-700">By: {showDetail.resolvedBy.firstName} {showDetail.resolvedBy.lastName}</p>}
                {showDetail.resolvedNotes && <p className="text-green-700 mt-1">{showDetail.resolvedNotes}</p>}
              </div>
            )}

            {showDetail.notifications?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Notifications ({showDetail.notifications.length})</p>
                {showDetail.notifications.map((n: any) => (
                  <div key={n.id} className="text-xs bg-gray-50 rounded p-2 mb-1">
                    <span className="font-medium">{n.title}</span> • {n.channel} • {n.state}
                  </div>
                ))}
              </div>
            )}

            {canResolve && showDetail.escalationState !== 'RESOLVED' && (
              <div className="border-t pt-3 space-y-2">
                <Input placeholder="Resolution notes (optional)" value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} />
                <Button onClick={handleResolve} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" /> Resolve Violation
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
