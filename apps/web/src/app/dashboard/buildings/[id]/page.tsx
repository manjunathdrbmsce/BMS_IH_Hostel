'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatStatus, statusColor } from '@/lib/utils';
import { BUILDING_STATUSES } from '@/lib/constants';
import {
  ArrowLeft, Building, MapPin, Phone, Mail, Layers,
  ShieldCheck, Edit2, Home, Clock, History,
} from 'lucide-react';

interface BuildingDetail {
  id: string;
  code: string;
  name: string;
  location: string | null;
  address: string | null;
  contactNo: string | null;
  email: string | null;
  totalFloors: number;
  status: string;
  description: string | null;
  hostels: Array<{ id: string; code: string; name: string; type: string; status: string; capacity: number }>;
  activePolicy: any | null;
  _count: { hostels: number; policies: number };
  createdAt: string;
  updatedAt: string;
}

interface PolicyVersion {
  id: string;
  version: number;
  isActive: boolean;
  weekdayCurfew: string;
  weekendCurfew: string;
  toleranceMin: number;
  createdAt: string;
  createdBy: string | null;
}

export default function BuildingDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN');

  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [policyHistory, setPolicyHistory] = useState<PolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', location: '', address: '', contactNo: '', email: '', totalFloors: 1, status: 'ACTIVE', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchBuilding = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, histRes] = await Promise.all([
        api.get<{ success: boolean; data: BuildingDetail }>(`/buildings/${id}`),
        api.get<{ success: boolean; data: PolicyVersion[] }>(`/policies/building/${id}/history`),
      ]);
      setBuilding(bRes.data);
      setPolicyHistory(histRes.data);
    } catch {
      addToast({ type: 'error', title: 'Failed to load building' });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { fetchBuilding(); }, [fetchBuilding]);

  const openEdit = () => {
    if (!building) return;
    setEditForm({
      name: building.name,
      location: building.location || '',
      address: building.address || '',
      contactNo: building.contactNo || '',
      email: building.email || '',
      totalFloors: building.totalFloors,
      status: building.status,
      description: building.description || '',
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/buildings/${id}`, editForm);
      addToast({ type: 'success', title: 'Building updated' });
      setShowEditModal(false);
      fetchBuilding();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update';
      addToast({ type: 'error', title: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Topbar title="Building Details" subtitle="Loading..." />
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="min-h-screen">
        <Topbar title="Building Not Found" />
        <div className="p-6">
          <Button variant="outline" onClick={() => router.push('/dashboard/buildings')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Buildings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar title={building.name} subtitle={`Building ${building.code}`} />

      <div className="p-6 space-y-6 animate-in">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/buildings')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {canWrite && (
            <Button size="sm" onClick={openEdit}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
        </div>

        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{building.name}</h1>
                <p className="text-white/80 text-sm">{building.code}</p>
              </div>
              <span className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor(building.status)}`}>
                {formatStatus(building.status)}
              </span>
            </div>
          </div>
          <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            <InfoItem icon={Layers} label="Total Floors" value={String(building.totalFloors)} />
            <InfoItem icon={Home} label="Hostels" value={String(building._count.hostels)} />
            <InfoItem icon={MapPin} label="Location" value={building.location || '—'} />
            <InfoItem icon={Phone} label="Contact" value={building.contactNo || '—'} />
          </div>
          {building.description && (
            <div className="px-6 pb-5 text-sm text-gray-600">{building.description}</div>
          )}
        </Card>

        {/* Linked Hostels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-indigo-600" /> Linked Hostels ({building.hostels.length})
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            {building.hostels.length === 0 ? (
              <p className="text-sm text-gray-500">No hostels linked to this building.</p>
            ) : (
              <div className="space-y-3">
                {building.hostels.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => router.push(`/dashboard/hostels/${h.id}`)}>
                    <div className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-sm text-gray-900">{h.name}</p>
                        <p className="text-xs text-gray-500">{h.code} · {h.type}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(h.status)}`}>
                      {formatStatus(h.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Active Policy */}
        {building.activePolicy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Active Policy — v{building.activePolicy.version}
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <PolicyField label="Weekday Curfew" value={building.activePolicy.weekdayCurfew} />
              <PolicyField label="Weekend Curfew" value={building.activePolicy.weekendCurfew} />
              <PolicyField label="Grace Period" value={`${building.activePolicy.toleranceMin} min`} />
              <PolicyField label="Max Leave Days" value={`${building.activePolicy.maxLeaveDays} days`} />
              <PolicyField label="Parent Approval" value={building.activePolicy.parentApprovalRequired ? 'Required' : 'Optional'} />
              <PolicyField label="Warden Escalation" value={`${building.activePolicy.wardenEscalationMin} min`} />
              <PolicyField label="Violation Threshold" value={String(building.activePolicy.repeatedViolationThreshold)} />
              <PolicyField label="Notify on Exit" value={building.activePolicy.notifyParentOnExit ? 'Yes' : 'No'} />
            </div>
          </Card>
        )}

        {/* Policy History */}
        {policyHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-600" /> Policy Version History
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="space-y-2">
                {policyHistory.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Badge variant={p.isActive ? 'success' : 'default'}>v{p.version}</Badge>
                      <div className="text-sm">
                        <span className="text-gray-700">Curfew: {p.weekdayCurfew} / {p.weekendCurfew}</span>
                        <span className="text-gray-400 mx-2">·</span>
                        <span className="text-gray-500">Grace: {p.toleranceMin}min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Building" size="lg">
        <div className="space-y-4">
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Location" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            <Input label="Total Floors" type="number" value={String(editForm.totalFloors)} onChange={(e) => setEditForm({ ...editForm, totalFloors: parseInt(e.target.value) || 1 })} />
          </div>
          <Input label="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact" value={editForm.contactNo} onChange={(e) => setEditForm({ ...editForm, contactNo: e.target.value })} />
            <Input label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <Select label="Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={BUILDING_STATUSES.map(s => ({ value: s.value, label: s.label }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function PolicyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
