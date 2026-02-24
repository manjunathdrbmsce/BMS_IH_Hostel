'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatStatus, statusColor } from '@/lib/utils';
import { ROOM_TYPES } from '@/lib/constants';
import {
  ArrowLeft,
  Building2,
  DoorOpen,
  BedDouble,
  Users,
  MapPin,
  Phone,
  Edit2,
  Plus,
  Layers,
  Wifi,
  Wind,
  Droplets,
} from 'lucide-react';

interface HostelDetail {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  contactNo: string | null;
  capacity: number;
  status: string;
  description: string | null;
  totalBlocks: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  createdAt: string;
}

interface Room {
  id: string;
  roomNo: string;
  floor: number;
  block: string | null;
  type: string;
  capacity: number;
  status: string;
  amenities: string[];
  beds: Array<{
    id: string;
    bedNo: string;
    status: string;
    student: { id: string; firstName: string; lastName: string } | null;
  }>;
}

export default function HostelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN');

  const [hostel, setHostel] = useState<HostelDetail | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const [editForm, setEditForm] = useState({ name: '', address: '', contactNo: '', status: '' });
  const [roomForm, setRoomForm] = useState({ roomNo: '', floor: 0, type: 'DOUBLE' as string, capacity: 2, block: '', amenities: '' });
  const [bulkForm, setBulkForm] = useState({ fromFloor: 1, toFloor: 4, fromRoom: 1, toRoom: 10, type: 'DOUBLE' as string, capacity: 2, block: '' });

  useEffect(() => {
    if (!params.id) return;
    api
      .get<{ success: boolean; data: HostelDetail }>(`/hostels/${params.id}`)
      .then((res) => {
        setHostel(res.data);
        setEditForm({
          name: res.data.name,
          address: res.data.address || '',
          contactNo: res.data.contactNo || '',
          status: res.data.status,
        });
      })
      .catch(() => addToast({ type: 'error', title: 'Hostel not found' }))
      .finally(() => setLoading(false));
  }, [params.id, addToast]);

  const fetchRooms = useCallback(async () => {
    if (!params.id) return;
    setRoomsLoading(true);
    try {
      const qs = new URLSearchParams({ hostelId: params.id as string, limit: '200' });
      if (selectedFloor !== null) qs.set('floor', String(selectedFloor));
      const res = await api.get<{ success: boolean; data: Room[] }>(`/rooms?${qs.toString()}`);
      setRooms(res.data);
    } catch {
      // silent
    } finally {
      setRoomsLoading(false);
    }
  }, [params.id, selectedFloor]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleEditHostel = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; data: HostelDetail }>(`/hostels/${params.id}`, editForm);
      setHostel(res.data);
      setShowEditModal(false);
      addToast({ type: 'success', title: 'Hostel updated' });
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Update failed' });
    } finally { setSaving(false); }
  };

  const handleAddRoom = async () => {
    setSaving(true);
    try {
      await api.post('/rooms', {
        hostelId: params.id,
        roomNo: roomForm.roomNo,
        floor: roomForm.floor,
        type: roomForm.type,
        capacity: roomForm.capacity,
        block: roomForm.block || undefined,
        amenities: roomForm.amenities ? roomForm.amenities.split(',').map(a => a.trim()) : [],
      });
      addToast({ type: 'success', title: 'Room created with beds' });
      setShowAddRoomModal(false);
      setRoomForm({ roomNo: '', floor: 0, type: 'DOUBLE', capacity: 2, block: '', amenities: '' });
      fetchRooms();
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Failed to create room' });
    } finally { setSaving(false); }
  };

  const handleBulkCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post<{ success: boolean; created: number }>('/rooms/bulk', {
        hostelId: params.id,
        ...bulkForm,
        block: bulkForm.block || undefined,
      });
      addToast({ type: 'success', title: `Created ${res.created || 'multiple'} rooms with beds` });
      setShowBulkModal(false);
      fetchRooms();
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Bulk create failed' });
    } finally { setSaving(false); }
  };

  // Get unique floors
  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);

  const bedStatusColor = (status: string) => {
    const map: Record<string, string> = {
      VACANT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      OCCUPIED: 'bg-blue-100 text-blue-700 border-blue-200',
      RESERVED: 'bg-purple-100 text-purple-700 border-purple-200',
      UNDER_MAINTENANCE: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const amenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <Wifi className="w-3 h-3" />;
    if (lower.includes('ac') || lower.includes('air')) return <Wind className="w-3 h-3" />;
    if (lower.includes('bath') || lower.includes('water')) return <Droplets className="w-3 h-3" />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Topbar title="Loading..." />
        <div className="p-6 space-y-6"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="min-h-screen">
        <Topbar title="Hostel Not Found" />
        <div className="p-6">
          <Button variant="outline" onClick={() => router.push('/dashboard/hostels')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar title={hostel.name} subtitle={`${hostel.code} · ${hostel.type} Hostel`} />

      <div className="p-6 space-y-6 animate-in">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/hostels')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {canWrite && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkModal(true)}>
                <Layers className="w-4 h-4 mr-1" /> Bulk Add Rooms
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddRoomModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Room
              </Button>
              <Button size="sm" onClick={() => setShowEditModal(true)}>
                <Edit2 className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>
          )}
        </div>

        {/* Overview */}
        <Card className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{hostel.name}</h2>
                <Badge variant="default">{hostel.code}</Badge>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(hostel.status)}`}>
                  {formatStatus(hostel.status)}
                </span>
              </div>
              {hostel.description && <p className="text-sm text-gray-500 mb-3">{hostel.description}</p>}
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                {hostel.address && (
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" />{hostel.address}</span>
                )}
                {hostel.contactNo && (
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-gray-400" />{hostel.contactNo}</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MiniCard label="Total Rooms" value={hostel.totalRooms} icon={DoorOpen} color="text-indigo-600" />
          <MiniCard label="Total Beds" value={hostel.totalBeds} icon={BedDouble} color="text-blue-600" />
          <MiniCard label="Occupied" value={hostel.occupiedBeds} icon={Users} color="text-emerald-600" />
          <MiniCard label="Vacant" value={hostel.vacantBeds} icon={BedDouble} color="text-amber-600" />
          <Card className="p-4">
            <p className="text-xs text-gray-500 mb-1">Occupancy</p>
            <p className="text-2xl font-bold text-gray-900">{hostel.occupancyRate}%</p>
            <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${hostel.occupancyRate > 90 ? 'bg-red-500' : hostel.occupancyRate > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${hostel.occupancyRate}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Floor Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Floor:</span>
          <button
            onClick={() => setSelectedFloor(null)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${selectedFloor === null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {floors.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFloor(f)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${selectedFloor === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 0 ? 'Ground' : `Floor ${f}`}
            </button>
          ))}
        </div>

        {/* Room Grid */}
        {roomsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No rooms yet"
            description="Add rooms to this hostel to get started"
            actionLabel="Add Room"
            onAction={() => setShowAddRoomModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <Card key={room.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <DoorOpen className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Room {room.roomNo}</span>
                      <p className="text-[10px] text-gray-500">Floor {room.floor}{room.block ? ` · Block ${room.block}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{room.type}</Badge>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(room.status)}`}>
                      {formatStatus(room.status)}
                    </span>
                  </div>
                </div>

                {/* Amenities */}
                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {room.amenities.map((a) => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded text-[10px] text-gray-600">
                        {amenityIcon(a)} {a}
                      </span>
                    ))}
                  </div>
                )}

                {/* Beds */}
                <div className="grid grid-cols-2 gap-2">
                  {room.beds.map((bed) => (
                    <div
                      key={bed.id}
                      className={`p-2 rounded-lg border text-center text-xs ${bedStatusColor(bed.status)}`}
                    >
                      <BedDouble className="w-3.5 h-3.5 mx-auto mb-0.5" />
                      <p className="font-semibold">Bed {bed.bedNo}</p>
                      {bed.student ? (
                        <p className="text-[10px] truncate">{bed.student.firstName} {bed.student.lastName}</p>
                      ) : (
                        <p className="text-[10px]">{bed.status}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Hostel Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Hostel">
        <div className="space-y-4">
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          <Input label="Contact" value={editForm.contactNo} onChange={(e) => setEditForm({ ...editForm, contactNo: e.target.value })} />
          <Select
            label="Status"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEditHostel} loading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Add Room Modal */}
      <Modal isOpen={showAddRoomModal} onClose={() => setShowAddRoomModal(false)} title="Add Room">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Room Number" value={roomForm.roomNo} onChange={(e) => setRoomForm({ ...roomForm, roomNo: e.target.value })} placeholder="101" required />
            <Input label="Floor" type="number" value={String(roomForm.floor)} onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Room Type" value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })} options={ROOM_TYPES.map(t => ({ value: t.value, label: t.label }))} />
            <Input label="Capacity" type="number" value={String(roomForm.capacity)} onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 1 })} />
          </div>
          <Input label="Block" value={roomForm.block} onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })} placeholder="A (optional)" />
          <Input label="Amenities" value={roomForm.amenities} onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })} placeholder="WiFi, AC, Attached Bathroom" hint="Comma-separated" />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddRoomModal(false)}>Cancel</Button>
            <Button onClick={handleAddRoom} loading={saving}><Plus className="w-4 h-4 mr-1" /> Create Room</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Create Rooms Modal */}
      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Create Rooms" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Automatically generate rooms across multiple floors. Beds will be auto-created.</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="From Floor" type="number" value={String(bulkForm.fromFloor)} onChange={(e) => setBulkForm({ ...bulkForm, fromFloor: parseInt(e.target.value) || 0 })} />
            <Input label="To Floor" type="number" value={String(bulkForm.toFloor)} onChange={(e) => setBulkForm({ ...bulkForm, toFloor: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="From Room #" type="number" value={String(bulkForm.fromRoom)} onChange={(e) => setBulkForm({ ...bulkForm, fromRoom: parseInt(e.target.value) || 1 })} />
            <Input label="To Room #" type="number" value={String(bulkForm.toRoom)} onChange={(e) => setBulkForm({ ...bulkForm, toRoom: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select label="Room Type" value={bulkForm.type} onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })} options={ROOM_TYPES.map(t => ({ value: t.value, label: t.label }))} />
            <Input label="Capacity" type="number" value={String(bulkForm.capacity)} onChange={(e) => setBulkForm({ ...bulkForm, capacity: parseInt(e.target.value) || 2 })} />
            <Input label="Block" value={bulkForm.block} onChange={(e) => setBulkForm({ ...bulkForm, block: e.target.value })} placeholder="A" />
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700">
            This will create <strong>{(bulkForm.toFloor - bulkForm.fromFloor + 1) * (bulkForm.toRoom - bulkForm.fromRoom + 1)}</strong> rooms with <strong>{bulkForm.capacity}</strong> beds each.
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancel</Button>
            <Button onClick={handleBulkCreate} loading={saving}>
              <Layers className="w-4 h-4 mr-1" /> Generate Rooms
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </Card>
  );
}
