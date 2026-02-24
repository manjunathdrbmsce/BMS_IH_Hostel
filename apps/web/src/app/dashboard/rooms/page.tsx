'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatStatus, statusColor } from '@/lib/utils';
import { ROOM_TYPES } from '@/lib/constants';
import {
  DoorOpen,
  BedDouble,
  Search,
  Filter,
  Wrench,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react';

interface Hostel {
  id: string;
  code: string;
  name: string;
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
  hostel?: { id: string; name: string; code: string };
  beds: Array<{
    id: string;
    bedNo: string;
    status: string;
    student: { firstName: string; lastName: string } | null;
  }>;
}

export default function RoomsPage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN');

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const [selectedHostel, setSelectedHostel] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Room-level stats  
  const totalRooms = meta.total;
  const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
  const fullRooms = rooms.filter(r => r.status === 'FULL').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'UNDER_MAINTENANCE').length;

  // Fetch hostels for dropdown
  useEffect(() => {
    api.get<{ success: boolean; data: Hostel[] }>('/hostels?limit=100')
      .then((res) => {
        setHostels(res.data);
        if (res.data.length > 0) setSelectedHostel(res.data[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchRooms = useCallback(async (page = 1) => {
    if (!selectedHostel) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hostelId: selectedHostel,
        page: String(page),
        limit: '50',
      });
      if (floorFilter) params.set('floor', floorFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await api.get<{ success: boolean; data: Room[]; meta: typeof meta }>(
        `/rooms?${params.toString()}`,
      );
      setRooms(res.data);
      setMeta(res.meta);
    } catch {
      addToast({ type: 'error', title: 'Failed to load rooms' });
    } finally {
      setLoading(false);
    }
  }, [selectedHostel, floorFilter, statusFilter, typeFilter, addToast]);

  useEffect(() => {
    if (selectedHostel) fetchRooms(1);
  }, [fetchRooms, selectedHostel]);

  const handleStatusChange = async () => {
    if (!selectedRoom) return;
    setSaving(true);
    try {
      await api.patch(`/rooms/${selectedRoom.id}`, { status: newStatus });
      addToast({ type: 'success', title: 'Room status updated' });
      setShowStatusModal(false);
      fetchRooms(meta.page);
    } catch (err: unknown) {
      addToast({ type: 'error', title: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Room>[] = [
    {
      key: 'roomNo',
      label: 'Room',
      sortable: true,
      render: (room) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <DoorOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Room {room.roomNo}</p>
            <p className="text-xs text-gray-500">Floor {room.floor}{room.block ? ` · Block ${room.block}` : ''}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (room) => <Badge variant="default">{room.type}</Badge>,
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (room) => <span className="text-gray-600">{room.capacity} beds</span>,
    },
    {
      key: 'beds',
      label: 'Bed Status',
      render: (room) => {
        const occupied = room.beds.filter(b => b.status === 'OCCUPIED').length;
        const vacant = room.beds.filter(b => b.status === 'VACANT').length;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${room.beds.length > 0 ? (occupied / room.beds.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{occupied}/{room.beds.length}</span>
          </div>
        );
      },
    },
    {
      key: 'amenities',
      label: 'Amenities',
      render: (room) => (
        <div className="flex flex-wrap gap-1">
          {room.amenities.slice(0, 3).map((a) => (
            <span key={a} className="px-1.5 py-0.5 bg-gray-50 rounded text-[10px] text-gray-600">{a}</span>
          ))}
          {room.amenities.length > 3 && (
            <span className="px-1.5 py-0.5 bg-gray-50 rounded text-[10px] text-gray-500">+{room.amenities.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (room) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(room.status)}`}>
          {formatStatus(room.status)}
        </span>
      ),
    },
    ...(canWrite ? [{
      key: 'actions',
      label: '',
      render: (room: Room) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedRoom(room);
            setNewStatus(room.status);
            setShowStatusModal(true);
          }}
        >
          <Wrench className="w-3.5 h-3.5" />
        </Button>
      ),
    }] as Column<Room>[] : []),
  ];

  return (
    <div className="min-h-screen">
      <Topbar title="Room Management" subtitle="Manage rooms across all hostels" />

      <div className="p-6 space-y-6 animate-in">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && rooms.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Total Rooms" value={totalRooms} icon={DoorOpen} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
              <StatCard title="Available" value={availableRooms} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
              <StatCard title="Full" value={fullRooms} icon={XCircle} iconColor="text-blue-600" iconBg="bg-blue-50" />
              <StatCard title="Maintenance" value={maintenanceRooms} icon={Wrench} iconColor="text-amber-600" iconBg="bg-amber-50" />
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Select
              label="Hostel"
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              options={hostels.map(h => ({ value: h.id, label: `${h.name} (${h.code})` }))}
              placeholder="Select hostel"
            />
            <Input
              label="Floor"
              type="number"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              placeholder="Any"
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[{ value: '', label: 'All Types' }, ...ROOM_TYPES]}
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'FULL', label: 'Full' },
                { value: 'UNDER_MAINTENANCE', label: 'Maintenance' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFloorFilter(''); setStatusFilter(''); setTypeFilter(''); }}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        {!selectedHostel ? (
          <EmptyState
            icon={Building2}
            title="Select a hostel"
            description="Choose a hostel from the filter above to view its rooms"
          />
        ) : (
          <Card>
            <DataTable<Room>
              columns={columns}
              data={rooms}
              loading={loading}
              rowKey={(r) => r.id}
              emptyMessage="No rooms found for this hostel"
            />
            <div className="px-4 border-t border-gray-100">
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={meta.limit}
                onPageChange={(p) => fetchRooms(p)}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Update Room ${selectedRoom?.roomNo}`}
      >
        <div className="space-y-4">
          <Select
            label="Room Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'FULL', label: 'Full' },
              { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
              { value: 'CLOSED', label: 'Closed' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button onClick={handleStatusChange} loading={saving}>Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
