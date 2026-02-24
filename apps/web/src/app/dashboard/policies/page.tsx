'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus, ShieldCheck, Building, Clock, ChevronRight, Edit2,
} from 'lucide-react';

interface Policy {
  id: string;
  buildingId: string;
  version: number;
  isActive: boolean;
  weekdayCurfew: string;
  weekendCurfew: string;
  toleranceMin: number;
  parentApprovalRequired: boolean;
  maxLeaveDays: number;
  wardenEscalationMin: number;
  repeatedViolationThreshold: number;
  notifyParentOnExit: boolean;
  notifyParentOnEntry: boolean;
  notifyParentOnLate: boolean;
  notifyWardenOnLate: boolean;
  overrideNotes: string | null;
  createdAt: string;
  createdBy: string | null;
  building: { id: string; code: string; name: string };
}

interface BuildingOption {
  id: string;
  code: string;
  name: string;
  status: string;
}

export default function PoliciesPage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN');

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const [buildingFilter, setBuildingFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const defaultForm = {
    buildingId: '',
    weekdayCurfew: '22:00',
    weekendCurfew: '23:00',
    toleranceMin: 15,
    parentApprovalRequired: true,
    maxLeaveDays: 7,
    wardenEscalationMin: 30,
    repeatedViolationThreshold: 3,
    notifyParentOnExit: true,
    notifyParentOnEntry: true,
    notifyParentOnLate: true,
    notifyWardenOnLate: true,
    overrideNotes: '',
  };
  const [form, setForm] = useState(defaultForm);
  const [creating, setCreating] = useState(false);

  const fetchPolicies = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (buildingFilter) params.set('buildingId', buildingFilter);
      if (activeOnly) params.set('activeOnly', 'true');

      const res = await api.get<{ success: boolean; data: Policy[]; meta: typeof meta }>(
        `/policies?${params.toString()}`,
      );
      setPolicies(res.data);
      setMeta(res.meta);
    } catch {
      addToast({ type: 'error', title: 'Failed to load policies' });
    } finally {
      setLoading(false);
    }
  }, [buildingFilter, activeOnly, addToast]);

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: BuildingOption[] }>('/buildings?limit=100');
      setBuildings(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);
  useEffect(() => {
    const timer = setTimeout(() => fetchPolicies(1), 300);
    return () => clearTimeout(timer);
  }, [fetchPolicies]);

  const handleCreate = async () => {
    if (!form.buildingId) {
      addToast({ type: 'error', title: 'Please select a building' });
      return;
    }
    setCreating(true);
    try {
      await api.post('/policies', {
        ...form,
        toleranceMin: Number(form.toleranceMin),
        maxLeaveDays: Number(form.maxLeaveDays),
        wardenEscalationMin: Number(form.wardenEscalationMin),
        repeatedViolationThreshold: Number(form.repeatedViolationThreshold),
        overrideNotes: form.overrideNotes || undefined,
      });
      addToast({ type: 'success', title: 'Policy created successfully' });
      setShowCreateModal(false);
      setForm(defaultForm);
      fetchPolicies(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create policy';
      addToast({ type: 'error', title: msg });
    } finally {
      setCreating(false);
    }
  };

  const openDetail = (policy: Policy) => {
    setSelectedPolicy(policy);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Policy Engine" subtitle="Manage building curfew, leave, and notification policies" />

      <div className="p-6 space-y-6 animate-in">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <Select value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)}
              options={[
                { value: '', label: 'All Buildings' },
                ...buildings.map(b => ({ value: b.id, label: `${b.code} – ${b.name}` })),
              ]} />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Active only
            </label>
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Policy
            </Button>
          )}
        </div>

        {/* Policies List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No policies found"
            description="Create a curfew and notification policy for a building"
            actionLabel="New Policy" onAction={() => setShowCreateModal(true)} />
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {policies.map((policy) => (
                <div key={policy.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => openDetail(policy)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    policy.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-gray-900">{policy.building.name}</h3>
                      <Badge variant={policy.isActive ? 'success' : 'default'}>v{policy.version}</Badge>
                      {policy.isActive && <Badge variant="success">Active</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Curfew: {policy.weekdayCurfew} (weekday) / {policy.weekendCurfew} (weekend) · Grace: {policy.toleranceMin}min · Max leave: {policy.maxLeaveDays}d
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(policy.createdAt).toLocaleDateString()}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
            <div className="px-4 border-t border-gray-100">
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={(p) => fetchPolicies(p)} />
            </div>
          </Card>
        )}
      </div>

      {/* Create Policy Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Policy" size="lg">
        <div className="space-y-4">
          <Select label="Building" value={form.buildingId}
            onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
            options={[
              { value: '', label: 'Select building...' },
              ...buildings.map(b => ({ value: b.id, label: `${b.code} – ${b.name}` })),
            ]} />

          <div className="grid grid-cols-3 gap-4">
            <Input label="Weekday Curfew" value={form.weekdayCurfew}
              onChange={(e) => setForm({ ...form, weekdayCurfew: e.target.value })} placeholder="22:00" />
            <Input label="Weekend Curfew" value={form.weekendCurfew}
              onChange={(e) => setForm({ ...form, weekendCurfew: e.target.value })} placeholder="23:00" />
            <Input label="Grace (min)" type="number" value={String(form.toleranceMin)}
              onChange={(e) => setForm({ ...form, toleranceMin: parseInt(e.target.value) || 0 })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Max Leave Days" type="number" value={String(form.maxLeaveDays)}
              onChange={(e) => setForm({ ...form, maxLeaveDays: parseInt(e.target.value) || 1 })} />
            <Input label="Escalation (min)" type="number" value={String(form.wardenEscalationMin)}
              onChange={(e) => setForm({ ...form, wardenEscalationMin: parseInt(e.target.value) || 5 })} />
            <Input label="Violation Threshold" type="number" value={String(form.repeatedViolationThreshold)}
              onChange={(e) => setForm({ ...form, repeatedViolationThreshold: parseInt(e.target.value) || 1 })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.parentApprovalRequired}
                onChange={(e) => setForm({ ...form, parentApprovalRequired: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600" />
              Parent Approval Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.notifyParentOnExit}
                onChange={(e) => setForm({ ...form, notifyParentOnExit: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600" />
              Notify Parent on Exit
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.notifyParentOnEntry}
                onChange={(e) => setForm({ ...form, notifyParentOnEntry: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600" />
              Notify Parent on Entry
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.notifyParentOnLate}
                onChange={(e) => setForm({ ...form, notifyParentOnLate: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600" />
              Notify Parent if Late
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.notifyWardenOnLate}
                onChange={(e) => setForm({ ...form, notifyWardenOnLate: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600" />
              Notify Warden if Late
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Override Notes</label>
            <textarea value={form.overrideNotes}
              onChange={(e) => setForm({ ...form, overrideNotes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
              placeholder="Special holiday exceptions, temporary changes, etc." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>
              <Plus className="w-4 h-4 mr-1" /> Create Policy
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}
        title={selectedPolicy ? `Policy v${selectedPolicy.version} – ${selectedPolicy.building.name}` : 'Policy'} size="lg">
        {selectedPolicy && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Weekday Curfew" value={selectedPolicy.weekdayCurfew} />
              <Field label="Weekend Curfew" value={selectedPolicy.weekendCurfew} />
              <Field label="Grace Period" value={`${selectedPolicy.toleranceMin} min`} />
              <Field label="Max Leave" value={`${selectedPolicy.maxLeaveDays} days`} />
              <Field label="Parent Approval" value={selectedPolicy.parentApprovalRequired ? 'Required' : 'Optional'} />
              <Field label="Escalation" value={`${selectedPolicy.wardenEscalationMin} min`} />
              <Field label="Violation Threshold" value={String(selectedPolicy.repeatedViolationThreshold)} />
              <Field label="Status" value={selectedPolicy.isActive ? 'Active' : 'Superseded'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Notify on Exit" value={selectedPolicy.notifyParentOnExit ? 'Yes' : 'No'} />
              <Field label="Notify on Entry" value={selectedPolicy.notifyParentOnEntry ? 'Yes' : 'No'} />
              <Field label="Notify on Late (Parent)" value={selectedPolicy.notifyParentOnLate ? 'Yes' : 'No'} />
              <Field label="Notify on Late (Warden)" value={selectedPolicy.notifyWardenOnLate ? 'Yes' : 'No'} />
            </div>
            {selectedPolicy.overrideNotes && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                <strong>Override Notes:</strong> {selectedPolicy.overrideNotes}
              </div>
            )}
            <p className="text-xs text-gray-400">Created: {new Date(selectedPolicy.createdAt).toLocaleString()}</p>
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
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
