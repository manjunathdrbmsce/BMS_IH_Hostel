'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatStatus, statusColor } from '@/lib/utils';
import { BUILDING_STATUSES } from '@/lib/constants';
import {
  Plus, Search, Building, MapPin, Phone, Hash, Mail, Layers,
  LayoutGrid, LayoutList, ShieldCheck, Home,
} from 'lucide-react';

interface BuildingItem {
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
  hostels: Array<{ id: string; code: string; name: string; type: string; status: string }>;
  activePolicy: any | null;
  _count: { hostels: number; policies: number };
  createdAt: string;
}

interface BuildingStats {
  total: number;
  active: number;
  underMaintenance: number;
  underConstruction: number;
  inactive: number;
  totalHostelsLinked: number;
}

export default function BuildingsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN');

  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [stats, setStats] = useState<BuildingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    code: '', name: '', location: '', address: '', contactNo: '', email: '', totalFloors: 4, description: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchBuildings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const [listRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; data: BuildingItem[]; meta: typeof meta }>(
          `/buildings?${params.toString()}`,
        ),
        api.get<{ success: boolean; data: BuildingStats }>('/buildings/stats'),
      ]);

      setBuildings(listRes.data);
      setMeta(listRes.meta);
      setStats(statsRes.data);
    } catch {
      addToast({ type: 'error', title: 'Failed to load buildings' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, addToast]);

  useEffect(() => {
    const timer = setTimeout(() => fetchBuildings(1), 300);
    return () => clearTimeout(timer);
  }, [fetchBuildings]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post('/buildings', form);
      addToast({ type: 'success', title: 'Building created successfully' });
      setShowCreateModal(false);
      setForm({ code: '', name: '', location: '', address: '', contactNo: '', email: '', totalFloors: 4, description: '' });
      fetchBuildings(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create building';
      addToast({ type: 'error', title: msg });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Topbar title="Building Management" subtitle="Manage campus buildings and linked hostels" />

      <div className="p-6 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!stats ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Total Buildings" value={stats.total} subtitle={`${stats.active} active`} icon={Building} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
              <StatCard title="Hostels Linked" value={stats.totalHostelsLinked} subtitle="Across all buildings" icon={Home} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
              <StatCard title="Under Maintenance" value={stats.underMaintenance} subtitle="Needs attention" icon={Layers} iconColor="text-amber-600" iconBg="bg-amber-50" />
              <StatCard title="Under Construction" value={stats.underConstruction} subtitle="Coming soon" icon={Building} iconColor="text-blue-600" iconBg="bg-blue-50" />
            </>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search buildings..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              options={[{ value: '', label: 'All Status' }, ...BUILDING_STATUSES]} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
            {canWrite && (
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Building
              </Button>
            )}
          </div>
        </div>

        {/* Building Cards / List */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'h-52 rounded-2xl' : 'h-20 rounded-xl'} />
            ))}
          </div>
        ) : buildings.length === 0 ? (
          <EmptyState icon={Building} title="No buildings found" description="Get started by adding your first building"
            actionLabel="Add Building" onAction={() => setShowCreateModal(true)} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {buildings.map((building) => (
              <Card key={building.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/buildings/${building.id}`)}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{building.name}</h3>
                        <p className="text-xs text-gray-500">{building.code}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(building.status)}`}>
                      {formatStatus(building.status)}
                    </span>
                  </div>
                  {building.location && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{building.location}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <MiniStat label="Floors" value={building.totalFloors} />
                    <MiniStat label="Hostels" value={building._count.hostels} />
                    <MiniStat label="Policies" value={building._count.policies} />
                  </div>
                  {building.activePolicy && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Policy v{building.activePolicy.version} active — Curfew {building.activePolicy.weekdayCurfew}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {buildings.map((building) => (
                <div key={building.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => router.push(`/dashboard/buildings/${building.id}`)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{building.name}</h3>
                      <Badge variant="default">{building.code}</Badge>
                    </div>
                    {building.location && <p className="text-xs text-gray-500 truncate">{building.location}</p>}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>{building.totalFloors} floors</span>
                    <span>{building._count.hostels} hostels</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor(building.status)}`}>
                    {formatStatus(building.status)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 border-t border-gray-100">
              <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={(p) => fetchBuildings(p)} />
            </div>
          </Card>
        )}

        {viewMode === 'grid' && meta.totalPages > 1 && (
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={(p) => fetchBuildings(p)} />
        )}
      </div>

      {/* Create Building Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New Building" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Building Code" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="BLK-A" leftIcon={<Hash className="w-4 h-4" />} required />
            <Input label="Building Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Block A – Krishna Hostel" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Location" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Basavanagudi Campus"
              leftIcon={<MapPin className="w-4 h-4" />} />
            <Input label="Total Floors" type="number" value={String(form.totalFloors)}
              onChange={(e) => setForm({ ...form, totalFloors: parseInt(e.target.value) || 1 })} />
          </div>
          <Input label="Address" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="No.1, Bull Temple Road, Basavanagudi"
            leftIcon={<MapPin className="w-4 h-4" />} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Number" value={form.contactNo}
              onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
              placeholder="+91 98765 43210"
              leftIcon={<Phone className="w-4 h-4" />} />
            <Input label="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="block-a@bms.edu"
              leftIcon={<Mail className="w-4 h-4" />} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
              placeholder="Brief description of the building..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>
              <Plus className="w-4 h-4 mr-1" /> Create Building
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 bg-gray-50 rounded-lg">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}
