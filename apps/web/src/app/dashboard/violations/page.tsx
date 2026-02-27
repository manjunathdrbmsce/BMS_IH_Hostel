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
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import {
  ShieldAlert, Search, AlertTriangle, CheckCircle, Clock, XOctagon, Scale,
} from 'lucide-react';

const typeIcon: Record<string, React.ElementType> = {
  LATE_ENTRY: Clock,
  OVERSTAY: XOctagon,
  EARLY_EXIT: AlertTriangle,
};

const escalationBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  NONE: 'default',
  WARNED: 'info',
  ESCALATED: 'danger',
  RESOLVED: 'success',
};

export default function ViolationsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
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

  const isStudent = hasRole('STUDENT');
  const canResolve = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (escalationFilter) params.set('escalationState', escalationFilter);
      // Students use /violations/my, admins use /violations
      const endpoint = isStudent ? `/violations/my?${params}` : `/violations?${params}`;
      const res = await api.get<any>(endpoint);
      setViolations(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      if (canResolve) {
        const statsRes = await api.get<any>('/violations/stats');
        setStats(statsRes.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, typeFilter, escalationFilter, canResolve, isStudent]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const viewDetail = async (id: string) => {
    try {
      const r = await api.get<any>(`/violations/${id}`);
      setShowDetail(r.data);
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to load details' });
    }
  };

  const handleResolve = async () => {
    if (!showDetail) return;
    try {
      await api.patch<any>(`/violations/${showDetail.id}/resolve`, { notes: resolveNotes });
      setResolveNotes('');
      const r = await api.get<any>(`/violations/${showDetail.id}`);
      setShowDetail(r.data);
      fetchData();
      addToast({ type: 'success', title: 'Violation resolved' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to resolve' });
    }
  };

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014';

  return (
    <div className="min-h-screen">
      <Topbar title="Violations" subtitle={isStudent ? 'Your curfew violations and escalations' : 'Curfew violations, overstays, and escalations'} />

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {loading && canResolve ? (
            Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard title="Today" value={stats.todayViolations} icon={ShieldAlert} iconColor="text-red-600" iconBg="bg-red-50" />
              <StatCard title="This Week" value={stats.weekViolations} icon={AlertTriangle} iconColor="text-orange-600" iconBg="bg-orange-50" />
              <StatCard title="Open Escalations" value={stats.openEscalations} icon={Scale} iconColor="text-red-500" iconBg="bg-red-50" />
              <StatCard title="Resolved (Week)" value={stats.resolvedThisWeek} icon={CheckCircle} iconColor="text-green-600" iconBg="bg-green-50" />
              <StatCard title="Total" value={stats.totalViolations} icon={XOctagon} iconColor="text-gray-600" iconBg="bg-gray-50" />
            </>
          ) : null}
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search student\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All Types</option>
              {VIOLATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={escalationFilter} onChange={(e) => { setEscalationFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="">All States</option>
              {ESCALATION_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></Card>
        ) : violations.length === 0 ? (
          <EmptyState title="No violations" description="No violations found matching your filters" />
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-gray-100">
              {violations.map((v: any) => {
                const TypeIcon = typeIcon[v.type] || ShieldAlert;
                return (
                  <div key={v.id} onClick={() => viewDetail(v.id)} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <TypeIcon className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{v.student?.firstName} {v.student?.lastName}</p>
                        <p className="text-xs text-gray-500">{v.student?.usn || v.student?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="danger">{VIOLATION_TYPES.find(t => t.value === v.type)?.label || v.type}</Badge>
                      <Badge variant={escalationBadge[v.escalationState] || 'default'}>{ESCALATION_STATES.find(s => s.value === v.escalationState)?.label || v.escalationState}</Badge>
                      <span className="text-sm font-medium text-red-600">{v.violatedByMinutes}m</span>
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

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Violation Details" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">USN</span><p className="font-medium">{showDetail.student?.usn || '\u2014'}</p></div>
              <div><span className="text-gray-500">Type</span><p><Badge variant="danger">{VIOLATION_TYPES.find(t => t.value === showDetail.type)?.label || showDetail.type}</Badge></p></div>
              <div><span className="text-gray-500">Escalation</span><p><Badge variant={escalationBadge[showDetail.escalationState] || 'default'}>{ESCALATION_STATES.find(s => s.value === showDetail.escalationState)?.label}</Badge></p></div>
              <div><span className="text-gray-500">Late By</span><p className="font-medium text-red-600">{showDetail.violatedByMinutes} minutes</p></div>
              <div><span className="text-gray-500">Repeated Count</span><p className="font-medium">{showDetail.repeatedCountSnapshot}\u00d7</p></div>
              <div><span className="text-gray-500">Expected Time</span><p className="font-medium">{fmtDate(showDetail.requestedOrApprovedTime)}</p></div>
              <div><span className="text-gray-500">Actual Time</span><p className="font-medium">{fmtDate(showDetail.actualTime)}</p></div>
              <div><span className="text-gray-500">Gate</span><p className="font-medium">{showDetail.gateEntry?.gateNo} ({showDetail.gateEntry?.type})</p></div>
              <div><span className="text-gray-500">Created</span><p className="font-medium">{fmtDate(showDetail.createdAt)}</p></div>
            </div>
            <div><span className="text-sm text-gray-500">Reason</span><p className="text-sm bg-gray-50 rounded-lg p-3 mt-1">{showDetail.reason}</p></div>
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
                  <div key={n.id} className="text-xs bg-gray-50 rounded-lg p-2 mb-1">
                    <span className="font-medium">{n.title}</span> \u2022 {n.channel} \u2022 {n.state}
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