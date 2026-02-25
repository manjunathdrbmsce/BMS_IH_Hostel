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
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import {
  ScanLine, Plus, Search, ArrowDownToLine, ArrowUpFromLine, Clock, AlertTriangle, ShieldCheck, Ticket,
} from 'lucide-react';

type TabType = 'entries' | 'passes';

const entryTypeIcon: Record<string, React.ReactNode> = {
  IN: <ArrowDownToLine className="h-5 w-5 text-green-500" />,
  OUT: <ArrowUpFromLine className="h-5 w-5 text-orange-500" />,
};

const passStatusColor: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  USED: 'bg-blue-100 text-blue-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function GatePage() {
  const { hasRole } = useAuth();
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
    } catch (e: any) { alert(e.message); }
  };

  const handleCreatePass = async () => {
    try {
      await api.post<any>('/gate/passes', passForm);
      setShowCreatePass(false);
      setPassForm({ studentId: '', purpose: '', visitorName: '', visitorPhone: '', validFrom: '', validTo: '' });
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdatePass = async (id: string, status: string) => {
    try {
      await api.patch<any>(`/gate/passes/${id}`, { status });
      fetchData();
      if (showDetail?.id === id) {
        const r = await api.get<any>(`/gate/passes/${id}`);
        setShowDetail({ ...r.data, _type: 'pass' });
      }
    } catch (e: any) { alert(e.message); }
  };

  const viewEntryDetail = async (id: string) => {
    const r = await api.get<any>(`/gate/entries/${id}`);
    setShowDetail({ ...r.data, _type: 'entry' });
  };

  const viewPassDetail = async (id: string) => {
    const r = await api.get<any>(`/gate/passes/${id}`);
    setShowDetail({ ...r.data, _type: 'pass' });
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gate Management</h1>
          <p className="text-sm text-gray-500 mt-1">Entry/exit logs and gate passes</p>
        </div>
        <div className="flex gap-2">
          {canManage && <Button onClick={() => setShowCreateEntry(true)}><ScanLine className="h-4 w-4 mr-2" /> Log Entry</Button>}
          {canManage && <Button onClick={() => setShowCreatePass(true)} variant="outline"><Ticket className="h-4 w-4 mr-2" /> Gate Pass</Button>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard title="Today In" value={stats.todayEntries} icon={<ArrowDownToLine className="h-5 w-5 text-green-600" />} />
          <StatCard title="Today Out" value={stats.todayExits} icon={<ArrowUpFromLine className="h-5 w-5 text-orange-600" />} />
          <StatCard title="Today Late" value={stats.todayLateEntries} icon={<AlertTriangle className="h-5 w-5 text-red-600" />} />
          <StatCard title="Total Late" value={stats.totalLateEntries} icon={<Clock className="h-5 w-5 text-red-400" />} />
          <StatCard title="Active Passes" value={stats.activePasses} icon={<Ticket className="h-5 w-5 text-blue-600" />} />
          <StatCard title="Used Passes" value={stats.usedPasses} icon={<ShieldCheck className="h-5 w-5 text-gray-600" />} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <button onClick={() => setTab('entries')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'entries' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <ScanLine className="h-4 w-4 inline mr-1" /> Entry/Exit Log
        </button>
        <button onClick={() => setTab('passes')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'passes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Ticket className="h-4 w-4 inline mr-1" /> Gate Passes
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        {tab === 'entries' && (
          <>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">All Types</option>
              <option value="IN">In</option>
              <option value="OUT">Out</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={lateOnly} onChange={(e) => { setLateOnly(e.target.checked); setPage(1); }} className="rounded" /> Late Only
            </label>
          </>
        )}
        {tab === 'passes' && (
          <select value={passStatus} onChange={(e) => { setPassStatus(e.target.value); setPage(1); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            {GATE_PASS_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
      </div>

      {loading ? <Spinner /> : (
        tab === 'entries' ? (
          entries.length === 0 ? <EmptyState title="No entries" description="No gate entries found" /> : (
            <div className="space-y-3">
              {entries.map((e: any) => (
                <div key={e.id} onClick={() => viewEntryDetail(e.id)} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {entryTypeIcon[e.type]}
                      <div>
                        <p className="font-medium text-gray-900">{e.student?.firstName} {e.student?.lastName}</p>
                        <p className="text-xs text-gray-500">{e.student?.usn || e.student?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={e.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>{e.type}</Badge>
                      {e.isLateEntry && <Badge className="bg-red-100 text-red-800">Late ({e.lateMinutes}m)</Badge>}
                      <span className="text-xs text-gray-400">{e.gateNo}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{fmtDate(e.timestamp)}{e.scannedBy && ` • by ${e.scannedBy.firstName} ${e.scannedBy.lastName}`}</div>
                </div>
              ))}
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )
        ) : (
          passes.length === 0 ? <EmptyState title="No passes" description="No gate passes found" /> : (
            <div className="space-y-3">
              {passes.map((p: any) => (
                <div key={p.id} onClick={() => viewPassDetail(p.id)} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Ticket className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{p.student?.firstName} {p.student?.lastName}</p>
                        <p className="text-xs text-gray-500">{p.purpose}</p>
                      </div>
                    </div>
                    <Badge className={passStatusColor[p.status] || ''}>{GATE_PASS_STATUSES.find(s => s.value === p.status)?.label || p.status}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                    <span>{fmtDate(p.validFrom)} → {fmtDate(p.validTo)}</span>
                    {p.visitorName && <span>Visitor: {p.visitorName}</span>}
                  </div>
                </div>
              ))}
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )
        )
      )}

      {/* Create Entry Modal */}
      <Modal open={showCreateEntry} onClose={() => setShowCreateEntry(false)} title="Log Gate Entry/Exit">
        <div className="space-y-4">
          <Input placeholder="Student User ID" value={entryForm.studentId} onChange={(e) => setEntryForm({ ...entryForm, studentId: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select value={entryForm.type} onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
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
      <Modal open={showCreatePass} onClose={() => setShowCreatePass(false)} title="Issue Gate Pass">
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
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail?._type === 'entry' ? 'Gate Entry Details' : 'Gate Pass Details'}>
        {showDetail && showDetail._type === 'entry' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">USN</span><p className="font-medium">{showDetail.student?.usn || '—'}</p></div>
              <div><span className="text-gray-500">Type</span><p><Badge className={showDetail.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>{showDetail.type}</Badge></p></div>
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
                    {viol.type} — {viol.violatedByMinutes}m late • Escalation: {viol.escalationState}
                  </div>
                ))}
              </div>
            )}
            {showDetail.notes && <div><span className="text-sm text-gray-500">Notes</span><p className="text-sm bg-gray-50 rounded p-2 mt-1">{showDetail.notes}</p></div>}
          </div>
        )}
        {showDetail && showDetail._type === 'pass' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Student</span><p className="font-medium">{showDetail.student?.firstName} {showDetail.student?.lastName}</p></div>
              <div><span className="text-gray-500">Status</span><p><Badge className={passStatusColor[showDetail.status]}>{GATE_PASS_STATUSES.find(s => s.value === showDetail.status)?.label}</Badge></p></div>
              <div><span className="text-gray-500">Purpose</span><p className="font-medium">{showDetail.purpose}</p></div>
              <div><span className="text-gray-500">Valid</span><p className="font-medium text-xs">{fmtDate(showDetail.validFrom)} → {fmtDate(showDetail.validTo)}</p></div>
              {showDetail.visitorName && <div><span className="text-gray-500">Visitor</span><p className="font-medium">{showDetail.visitorName}</p></div>}
              {showDetail.visitorPhone && <div><span className="text-gray-500">Visitor Phone</span><p className="font-medium">{showDetail.visitorPhone}</p></div>}
              {showDetail.approvedBy && <div><span className="text-gray-500">Approved By</span><p className="font-medium">{showDetail.approvedBy.firstName} {showDetail.approvedBy.lastName}</p></div>}
            </div>
            {canManage && showDetail.status === 'ACTIVE' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleUpdatePass(showDetail.id, 'USED')} className="flex-1 bg-blue-600 hover:bg-blue-700">Mark Used</Button>
                <Button onClick={() => handleUpdatePass(showDetail.id, 'CANCELLED')} className="flex-1 bg-red-600 hover:bg-red-700">Cancel</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
