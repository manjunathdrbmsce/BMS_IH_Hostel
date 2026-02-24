'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatStatus, statusColor } from '@/lib/utils';
import { ASSIGNMENT_STATUSES } from '@/lib/constants';
import {
  BedDouble, ArrowRightLeft, LogOut, Search, ChevronRight,
  CheckCircle, XCircle, ArrowRight, Plus, Users, TrendingUp,
} from 'lucide-react';

interface BedAssignment {
  id: string;
  studentId: string;
  bedId: string;
  status: string;
  assignedAt: string;
  vacatedAt: string | null;
  reason: string | null;
  notes: string | null;
  assignedById: string;
  student: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      usn: string | null;
    };
    department: string | null;
    year: number | null;
  };
  bed: {
    id: string;
    bedNo: string;
    room: {
      roomNo: string;
      floor: number;
      hostel: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
}

interface AllotmentStats {
  activeAssignments: number;
  totalVacated: number;
  totalTransferred: number;
  studentProfiles: number;
}

export default function AllotmentsPage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN');

  const [assignments, setAssignments] = useState<BedAssignment[]>([]);
  const [stats, setStats] = useState<AllotmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ studentId: '', bedId: '', reason: '', notes: '' });
  const [assigning, setAssigning] = useState(false);

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ studentId: '', newBedId: '', reason: '' });
  const [transferring, setTransferring] = useState(false);

  // Vacate Modal
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [vacateForm, setVacateForm] = useState({ studentId: '', reason: '' });
  const [vacating, setVacating] = useState(false);

  // Detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<BedAssignment | null>(null);

  const fetchAssignments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get<{ success: boolean; data: BedAssignment[]; meta: typeof meta }>(
        `/allotments?${params.toString()}`,
      );
      setAssignments(res.data);
      setMeta(res.meta);
    } catch {
      addToast({ type: 'error', title: 'Failed to load assignments' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: AllotmentStats }>('/allotments/stats');
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchAssignments(1), 300);
    return () => clearTimeout(timer);
  }, [fetchAssignments]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const refreshAll = () => { fetchAssignments(1); fetchStats(); };

  const handleAssign = async () => {
    if (!assignForm.studentId || !assignForm.bedId) {
      addToast({ type: 'error', title: 'Student ID and Bed ID are required' });
      return;
    }
    setAssigning(true);
    try {
      await api.post('/allotments/assign', {
        studentId: assignForm.studentId,
        bedId: assignForm.bedId,
        reason: assignForm.reason || undefined,
        notes: assignForm.notes || undefined,
      });
      addToast({ type: 'success', title: 'Bed assigned successfully' });
      setShowAssignModal(false);
      setAssignForm({ studentId: '', bedId: '', reason: '', notes: '' });
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign bed';
      addToast({ type: 'error', title: msg });
    } finally {
      setAssigning(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.studentId || !transferForm.newBedId) {
      addToast({ type: 'error', title: 'Student ID and New Bed ID are required' });
      return;
    }
    setTransferring(true);
    try {
      await api.post('/allotments/transfer', {
        studentId: transferForm.studentId,
        newBedId: transferForm.newBedId,
        reason: transferForm.reason || undefined,
      });
      addToast({ type: 'success', title: 'Student transferred successfully' });
      setShowTransferModal(false);
      setTransferForm({ studentId: '', newBedId: '', reason: '' });
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transfer failed';
      addToast({ type: 'error', title: msg });
    } finally {
      setTransferring(false);
    }
  };

  const handleVacate = async () => {
    if (!vacateForm.studentId) {
      addToast({ type: 'error', title: 'Student ID is required' });
      return;
    }
    setVacating(true);
    try {
      await api.post('/allotments/vacate', {
        studentId: vacateForm.studentId,
        reason: vacateForm.reason || undefined,
      });
      addToast({ type: 'success', title: 'Bed vacated successfully' });
      setShowVacateModal(false);
      setVacateForm({ studentId: '', reason: '' });
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vacate failed';
      addToast({ type: 'error', title: msg });
    } finally {
      setVacating(false);
    }
  };

  const filteredAssignments = search
    ? assignments.filter((a) => {
        const term = search.toLowerCase();
        return (
          a.student.user.firstName.toLowerCase().includes(term) ||
          a.student.user.lastName.toLowerCase().includes(term) ||
          (a.student.user.usn && a.student.user.usn.toLowerCase().includes(term)) ||
          a.bed.bedNo.toLowerCase().includes(term) ||
          a.bed.room.hostel.name.toLowerCase().includes(term)
        );
      })
    : assignments;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'VACATED': return 'danger';
      case 'TRANSFERRED': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Bed Allotments" subtitle="Manage bed assignments, transfers, and vacations" />

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="Active" value={stats?.activeAssignments ?? '—'} icon={CheckCircle}
            iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard title="Vacated" value={stats?.totalVacated ?? '—'} icon={XCircle}
            iconColor="text-red-600" iconBg="bg-red-50" />
          <StatCard title="Transferred" value={stats?.totalTransferred ?? '—'} icon={ArrowRightLeft}
            iconColor="text-amber-600" iconBg="bg-amber-50" />
          <StatCard title="Student Profiles" value={stats?.studentProfiles ?? '—'} icon={Users}
            iconColor="text-indigo-600" iconBg="bg-indigo-50" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search student, bed, hostel..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                ...ASSIGNMENT_STATUSES,
              ]} />
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setShowAssignModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Assign
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowTransferModal(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-1" /> Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowVacateModal(true)}>
                <LogOut className="w-4 h-4 mr-1" /> Vacate
              </Button>
            </div>
          )}
        </div>

        {/* Assignment List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyState icon={BedDouble} title="No assignments found"
            description="Assign beds to students to get started"
            actionLabel="Assign Bed" onAction={() => setShowAssignModal(true)} />
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {filteredAssignments.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => { setSelectedAssignment(a); setShowDetailModal(true); }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    a.status === 'ACTIVE' ? 'bg-green-50 text-green-600' :
                    a.status === 'VACATED' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-gray-900">
                        {a.student.user.firstName} {a.student.user.lastName}
                      </h3>
                      {a.student.user.usn && <Badge variant="default">{a.student.user.usn}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Bed {a.bed.bedNo} · Room {a.bed.room.roomNo} · Floor {a.bed.room.floor} · {a.bed.room.hostel.name}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(a.assignedAt).toLocaleDateString()}
                  </div>
                  <Badge variant={statusBadge(a.status)}>{formatStatus(a.status)}</Badge>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
            <div className="px-4 border-t border-gray-100">
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit}
                onPageChange={(p) => fetchAssignments(p)} />
            </div>
          </Card>
        )}
      </div>

      {/* Assign Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Bed to Student">
        <div className="space-y-4">
          <Input label="Student Profile ID" value={assignForm.studentId}
            onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
            placeholder="Paste student profile UUID" required />
          <Input label="Bed ID" value={assignForm.bedId}
            onChange={(e) => setAssignForm({ ...assignForm, bedId: e.target.value })}
            placeholder="Paste bed UUID" required />
          <Input label="Reason" value={assignForm.reason}
            onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
            placeholder="First-year allotment" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              rows={2} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
              placeholder="Additional notes" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} loading={assigning}>
              <Plus className="w-4 h-4 mr-1" /> Assign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Student">
        <div className="space-y-4">
          <Input label="Student Profile ID" value={transferForm.studentId}
            onChange={(e) => setTransferForm({ ...transferForm, studentId: e.target.value })}
            placeholder="Student profile UUID" required />
          <Input label="New Bed ID" value={transferForm.newBedId}
            onChange={(e) => setTransferForm({ ...transferForm, newBedId: e.target.value })}
            placeholder="Destination bed UUID" required />
          <Input label="Reason" value={transferForm.reason}
            onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
            placeholder="Room change request" />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            <Button onClick={handleTransfer} loading={transferring}>
              <ArrowRightLeft className="w-4 h-4 mr-1" /> Transfer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Vacate Modal */}
      <Modal isOpen={showVacateModal} onClose={() => setShowVacateModal(false)} title="Vacate Bed">
        <div className="space-y-4">
          <Input label="Student Profile ID" value={vacateForm.studentId}
            onChange={(e) => setVacateForm({ ...vacateForm, studentId: e.target.value })}
            placeholder="Student profile UUID" required />
          <Input label="Reason" value={vacateForm.reason}
            onChange={(e) => setVacateForm({ ...vacateForm, reason: e.target.value })}
            placeholder="Graduation, transfer, etc." />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowVacateModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleVacate} loading={vacating}>
              <LogOut className="w-4 h-4 mr-1" /> Vacate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assignment Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedAssignment(null); }}
        title="Assignment Details">
        {selectedAssignment && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedAssignment.status === 'ACTIVE' ? 'bg-green-100 text-green-600' :
                selectedAssignment.status === 'VACATED' ? 'bg-red-100 text-red-600' :
                'bg-amber-100 text-amber-600'
              }`}>
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedAssignment.student.user.firstName} {selectedAssignment.student.user.lastName}
                </h3>
                <p className="text-xs text-gray-500">{selectedAssignment.student.user.email}</p>
              </div>
              <Badge variant={statusBadge(selectedAssignment.status)} className="ml-auto">
                {formatStatus(selectedAssignment.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="USN" value={selectedAssignment.student.user.usn || '—'} />
              <Field label="Department" value={selectedAssignment.student.department || '—'} />
              <Field label="Bed" value={selectedAssignment.bed.bedNo} />
              <Field label="Room" value={selectedAssignment.bed.room.roomNo} />
              <Field label="Floor" value={String(selectedAssignment.bed.room.floor)} />
              <Field label="Hostel" value={`${selectedAssignment.bed.room.hostel.name} (${selectedAssignment.bed.room.hostel.code})`} />
              <Field label="Assigned At" value={new Date(selectedAssignment.assignedAt).toLocaleString()} />
              <Field label="Vacated At" value={selectedAssignment.vacatedAt ? new Date(selectedAssignment.vacatedAt).toLocaleString() : '—'} />
            </div>

            {selectedAssignment.reason && (
              <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
                <strong>Reason:</strong> {selectedAssignment.reason}
              </div>
            )}
            {selectedAssignment.notes && (
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
                <strong>Notes:</strong> {selectedAssignment.notes}
              </div>
            )}

            {canWrite && selectedAssignment.status === 'ACTIVE' && (
              <div className="flex gap-2 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => {
                  setTransferForm({ studentId: selectedAssignment.studentId, newBedId: '', reason: '' });
                  setShowDetailModal(false);
                  setShowTransferModal(true);
                }}>
                  <ArrowRightLeft className="w-4 h-4 mr-1" /> Transfer
                </Button>
                <Button size="sm" variant="danger" onClick={() => {
                  setVacateForm({ studentId: selectedAssignment.studentId, reason: '' });
                  setShowDetailModal(false);
                  setShowVacateModal(true);
                }}>
                  <LogOut className="w-4 h-4 mr-1" /> Vacate
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  );
}
