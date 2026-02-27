'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { GATE_PASS_STATUSES } from '@/lib/constants';
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
  ScanLine, Plus, Search, ArrowDownToLine, ArrowUpFromLine, Clock, AlertTriangle, ShieldCheck, Ticket,
} from 'lucide-react';

type TabType = 'entries' | 'passes';

const passStatusBadge: Record<string, 'default' | 'success' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  USED: 'info',
  EXPIRED: 'default',
  CANCELLED: 'danger',
};

export default function GatePage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState<TabType>('entries');
  const [entries, setEntries] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [lateOnly, setLateOnly] = useState(false);
  const [passStatus, setPassStatus] = useState('');
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [entryForm, setEntryForm] = useState({ studentId: '', type: 'IN', gateNo: 'Gate-1', linkedLeaveId: '', notes: '' });
  const [passForm, setPassForm] = useState({ studentId: '', purpose: '', visitorName: '', visitorPhone: '', validFrom: '', validTo: '' });

  const canManage = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'SECURITY_GUARD');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'entries') {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (typeFilter) params.set('type', typeFilter);
        if (lateOnly) params.set('lateOnly', 'true');
        const res = await api.get<any>(`/gate/entries?${params}`);
        setEntries(res.data || []);
        setTotalPages(res.meta?.totalPages || 1);
      } else {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (passStatus) params.set('status', passStatus);
        const res = await api.get<any>(`/gate/passes?${params}`);
        setPasses(res.data || []);
        setTotalPages(res.meta?.totalPages || 1);
      }
      if (canManage) {
        const statsRes = await api.get<any>('/gate/stats');
        setStats(statsRes.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [tab, page, search, typeFilter, lateOnly, passStatus, canManage]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); setSearch(''); }, [tab]);

  const handleCreateEntry = async () => {
    try {
      const payload: any = { studentId: entryForm.studentId, type: entryForm.type, gateNo: entryForm.gateNo };
      if (entryForm.linkedLeaveId) payload.linkedLeaveId = entryForm.linkedLeaveId;
      if (entryForm.notes) payload.notes = entryForm.notes;
      await api.post<any>('/gate/entries', payload);
      setShowCreateEntry(false);
      setEntryForm({ studentId: '', type: 'IN', gateNo: 'Gate-1', linkedLeaveId: '', notes: '' });
      fetchData();
      addToast({ type: 'success', title: 'Gate entry logged' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to log entry' });
    }
  };

  const handleCreatePass = async () => {
    try {
      await api.post<any>('/gate/passes', passForm);
      setShowCreatePass(false);
      setPassForm({ studentId: '', purpose: '', visitorName: '', visitorPhone: '', validFrom: '', validTo: '' });
      fetchData();
      addToast({ type: 'success', title: 'Gate pass issued' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to issue pass' });
    }
  };

  const handleUpdatePass = async (id: string, status: string) => {
    try {
      await api.patch<any>(`/gate/passes/${id}`, { status });
      fetchData();
      if (showDetail?.id === id) {
        const r = await api.get<any>(`/gate/passes/${id}`);
        setShowDetail({ ...r.data, _type: 'pass' });
      }
      addToast({ type: 'success', title: `Pass ${status.toLowerCase()}` });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to update pass' });
    }
  };

  const viewEntryDetail = async (id: string) => {
    const r = await api.get<any>(`/gate/entries/${id}`);
    setShowDetail({ ...r.data, _type: 'entry' });
  };

  const viewPassDetail = async (id: string) => {
    const r = await api.get<any>(`/gate/passes/${id}`);
    setShowDetail({ ...r.data, _type: 'pass' });
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014';

  return (
    <div className="min-h-screen">
      <Topbar title="Gate Management" subtitle="Entry/exit logs and gate passes">
        <div className="flex gap-2">
          {canManage && <Button onClick={() => setShowCreateEntry(true)}><ScanLine className="h-4 w-4 mr-2" /> Log Entry</Button>}
          {canManage && <Button onClick={() => setShowCreatePass(true)} variant="outline"><Ticket className="h-4 w-4 mr-2" /> Gate Pass</Button>}
        </div>
      </Topbar>

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading && canManage ? (
            Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard title="Today In" value={stats.todayEntries} icon={ArrowDownToLine} iconColor="text-green-600" iconBg="bg-green-50" />
              <StatCard title="Today Out" value={stats.todayExits} icon={ArrowUpFromLine} iconColor="text-orange-600" iconBg="bg-orange-50" />
              <StatCard title="Today Late" value={stats.todayLateEntries} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50" />
              <StatCard title="Total Late" value={stats.totalLateEntries} icon={Clock} iconColor="text-red-400" iconBg="bg-red-50" />
              <StatCard title="Active Passes" value={stats.activePasses} icon={Ticket} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatCard title="Used Passes" value={stats.usedPasses} icon={ShieldCheck} iconColor="text-gray-600" iconBg="bg-gray-50" />
            </>
          ) : null}
        </div>

        {/* Tabs */}
        <Card>
          <div className="flex border-b -mx-6 -mt-6 px-6">
            <button onClick={() => setTab('entries')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'entries' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <ScanLine className="h-4 w-4 inline mr-1.5" /> Entry/Exit Log
            </button>
            <button onClick={() => setTab('passes')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'passes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Ticket className="h-4 w-4 inline mr-1.5" /> Gate Passes
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search\u2026" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            {tab === 'entries' && (
              <>
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                  <option value="">All Types</option>
                  <option value="IN">In</option>
                  <option value="OUT">Out</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm cursor-pointer">
                  <input type="checkbox" checked={lateOnly} onChange={(e) => { setLateOnly(e.target.checked); setPage(1); }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-200" /> Late Only
                </label>
              </>
            )}
            {tab === 'passes' && (
              <select value={passStatus} onChange={(e) => { setPassStatus(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none">
                <option value="">All Statuses</option>
                {GATE_PASS_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <Card><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></Card>
        ) : tab === 'entries' ? (
          entries.length === 0 ? <EmptyState title="No entries" description="No gate entries found" /> : (
            <Card padding={false}>
              <div className="divide-y divide-gray-100">
                {entries.map((e: any) => (
                  <div key={e.id} onClick={() => viewEntryDetail(e.id)} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${e.type === 'IN' ? 'bg-green-50' : 'bg-orange-50'}`}>
                        {e.type === 'IN' ? <ArrowDownToLine className="h-4 w-4 text-green-500" /> : <ArrowUpFromLine className="h-4 w-4 text-orange-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{e.student?.firstName} {e.student?.lastName}</p>
                        <p className="text-xs text-gray-500">{e.student?.usn || e.student?.email} \u2022 {fmtDate(e.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={e.type === 'IN' ? 'success' : 'info'}>{e.type}</Badge>
                      {e.isLateEntry && <Badge variant="danger">Late ({e.lateMinutes}m)</Badge>}
                      <span className="text-xs text-gray-400">{e.gateNo}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </Card>
          )
        ) : (
          passes.length === 0 ? <EmptyState title="No passes" description="No gate passes found" /> : (
            <Card padding={false}>
              <div className="divide-y divide-gray-100">
                {passes.map((p: any) => (
                  <div key={p.id} onClick={() => viewPassDetail(p.id)} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <Ticket className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{p.student?.firstName} {p.student?.lastName}</p>
                        <p className="text-xs text-gray-500">{p.purpose}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={passStatusBadge[p.status] || 'default'}>{GATE_PASS_STATUSES.find(s => s.value === p.status)?.label || p.status}</Badge>
                      <span className="text-xs text-gray-400">{fmtDate(p.validFrom)} \u2192 {fmtDate(p.validTo)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </Card>
          )
        )}
      </div>

      {/* Create Entry Modal */}
      <Modal open={showCreateEntry} onClose={() => setShowCreateEntry(false)} title="Log Gate Entry/Exit" size="lg">
        <div className="space-y-4">
          <Input placeholder="Student User ID" value={entryForm.studentId} onChange={(e) => setEntryForm({ ...entryForm, studentId: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select value={entryForm.type} onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <option value="IN">Entry (IN)</option>
              <option value="OUT">Exit (OUT)</option>
            </select>
            <Input placeholder="Gate No" value={entryForm.gateNo} onChange={(e) => setEntryForm({ ...entryForm, gateNo: e.target.value })} />
          </div>
          <Input placeholder="Linked Leave ID (optional)" value={entryForm.linkedLeaveId} onChange={(e) => setEntryForm({ ...entryForm, linkedLeaveId: e.target.value })} />
          <Input placeholder="Notes (optional)" value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} />
          <Button onClick={handleCreateEntry} className="w-full">Log Entry</Button>
        </div>
      </Modal>

      {/* Create Pass Modal */}
      <Modal open={showCreatePass} onClose={() => setShowCreatePass(false)} title="Issue Gate Pass" size="lg">
        <div className="space-y-4">
          <Input placeholder="Student User ID" value={passForm.studentId} onChange={(e) => setPassForm({ ...passForm, studentId: e.target.value })} />
          <Input placeholder="Purpose" value={passForm.purpose} onChange={(e) => setPassForm({ ...passForm, purpose: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Visitor Name (optional)" value={passForm.visitorName} onChange={(e) => setPassForm({ ...passForm, visitorName: e.target.value })} />
            <Input placeholder="Visitor Phone (optional)" value={passForm.visitorPhone} onChange={(e) => setPassForm({ ...passForm, visitorPhone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Valid From</label><Input type="datetime-local" value={passForm.validFrom} onChange={(e) => setPassForm({ ...passForm, validFrom: e.target.value })} /></div>
            <div><label className="text-xs text-gray-500">Valid To</label><Input type="datetime-local" value={passForm.validTo} onChange={(e) => setPassForm({ ...passForm, validTo: e.target.value })} /></div>
          </div>
          <Button onClick={handleCreatePass} className="w-full">Issue Pass</Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?._type === 'entry' ? 'Gate Entry Details' : 'Gate Pass Details'} size="lg">
        {showDetail && showDetail._type === 'entry' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">USN</span><p className="font-medium">{showDetail.student?.usn || '\u2014'}</p></div>
              <div><span className="text-gray-500">Type</span><p><Badge variant={showDetail.type === 'IN' ? 'success' : 'info'}>{showDetail.type}</Badge></p></div>
              <div><span className="text-gray-500">Gate</span><p className="font-medium">{showDetail.gateNo}</p></div>
              <div><span className="text-gray-500">Timestamp</span><p className="font-medium">{fmtDate(showDetail.timestamp)}</p></div>
              <div><span className="text-gray-500">Late Entry</span><p className="font-medium">{showDetail.isLateEntry ? `Yes (${showDetail.lateMinutes} min)` : 'No'}</p></div>
              {showDetail.scannedBy && <div><span className="text-gray-500">Scanned By</span><p className="font-medium">{showDetail.scannedBy.firstName} {showDetail.scannedBy.lastName}</p></div>}
              {showDetail.linkedLeave && <div><span className="text-gray-500">Linked Leave</span><p className="font-medium">{showDetail.linkedLeave.type} ({showDetail.linkedLeave.status})</p></div>}
            </div>
            {showDetail.policySnapshot && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">Policy Snapshot (v{showDetail.policySnapshot.policyVersion})</p>
                <div className="grid grid-cols-2 gap-1 text-blue-700">
                  <span>Curfew: {showDetail.policySnapshot.curfewTimeUsed}</span>
                  <span>Tolerance: {showDetail.policySnapshot.toleranceMinUsed} min</span>
                </div>
              </div>
            )}
            {showDetail.violations?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-red-800 mb-1">Violations ({showDetail.violations.length})</p>
                {showDetail.violations.map((viol: any) => (
                  <div key={viol.id} className="text-red-700">
                    {viol.type} \u2014 {viol.violatedByMinutes}m late \u2022 Escalation: {viol.escalationState}
                  </div>
                ))}
              </div>
            )}
            {showDetail.notes && <div><span className="text-sm text-gray-500">Notes</span><p className="text-sm bg-gray-50 rounded-lg p-2 mt-1">{showDetail.notes}</p></div>}
          </div>
        )}
        {showDetail && showDetail._type === 'pass' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">Status</span><p><Badge variant={passStatusBadge[showDetail.status] || 'default'}>{GATE_PASS_STATUSES.find(s => s.value === showDetail.status)?.label}</Badge></p></div>
              <div><span className="text-gray-500">Purpose</span><p className="font-medium">{showDetail.purpose}</p></div>
              <div><span className="text-gray-500">Valid</span><p className="font-medium text-xs">{fmtDate(showDetail.validFrom)} \u2192 {fmtDate(showDetail.validTo)}</p></div>
              {showDetail.visitorName && <div><span className="text-gray-500">Visitor</span><p className="font-medium">{showDetail.visitorName}</p></div>}
              {showDetail.visitorPhone && <div><span className="text-gray-500">Visitor Phone</span><p className="font-medium">{showDetail.visitorPhone}</p></div>}
              {showDetail.approvedBy && <div><span className="text-gray-500">Approved By</span><p className="font-medium">{showDetail.approvedBy.firstName} {showDetail.approvedBy.lastName}</p></div>}
            </div>
            {canManage && showDetail.status === 'ACTIVE' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleUpdatePass(showDetail.id, 'USED')} variant="primary" className="flex-1">Mark Used</Button>
                <Button onClick={() => handleUpdatePass(showDetail.id, 'CANCELLED')} variant="danger" className="flex-1">Cancel</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}