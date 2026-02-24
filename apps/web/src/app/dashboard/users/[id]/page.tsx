'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime, formatStatus, statusColor, roleColor } from '@/lib/utils';
import { USER_STATUSES } from '@/lib/constants';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  Clock,
  Edit2,
  Ban,
  CheckCircle,
  UserX,
  Activity,
  Building2,
} from 'lucide-react';

interface UserDetail {
  id: string;
  email: string;
  mobile: string | null;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  createdBy: string | null;
  roles: Array<{
    name: string;
    displayName: string;
    assignedAt: string;
    hostelId: string | null;
  }>;
  _count?: {
    auditLogs: number;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN');

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
  });
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (!params.id) return;
    api
      .get<{ success: boolean; data: UserDetail }>(`/users/${params.id}`)
      .then((res) => {
        setUser(res.data);
        setEditForm({
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          mobile: res.data.mobile || '',
        });
        setNewStatus(res.data.status);
      })
      .catch(() => addToast({ type: 'error', title: 'User not found' }))
      .finally(() => setLoading(false));
  }, [params.id, addToast]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; data: UserDetail }>(
        `/users/${params.id}`,
        editForm,
      );
      setUser(res.data);
      setShowEditModal(false);
      addToast({ type: 'success', title: 'User updated successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      addToast({ type: 'error', title: message });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; data: UserDetail }>(
        `/users/${params.id}`,
        { status: newStatus },
      );
      setUser(res.data);
      setShowStatusModal(false);
      addToast({ type: 'success', title: 'Status updated' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Status change failed';
      addToast({ type: 'error', title: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Topbar title="User Details" subtitle="Loading..." />
        <div className="p-6 space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Topbar title="User Not Found" />
        <div className="p-6">
          <Button variant="outline" onClick={() => router.push('/dashboard/users')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title={`${user.firstName} ${user.lastName}`}
        subtitle={user.email}
      />

      <div className="p-6 space-y-6 animate-in">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/users')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {canWrite && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowStatusModal(true)}>
                <Shield className="w-4 h-4 mr-1" /> Change Status
              </Button>
              <Button size="sm" onClick={() => setShowEditModal(true)}>
                <Edit2 className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <Avatar name={`${user.firstName} ${user.lastName}`} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(user.status)}`}>
                  {formatStatus(user.status)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {user.roles.map((r) => (
                  <span
                    key={r.name}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleColor(r.name)}`}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {r.displayName}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <InfoItem icon={Mail} label="Email" value={user.email} />
                <InfoItem icon={Phone} label="Mobile" value={user.mobile || 'Not set'} />
                <InfoItem icon={Calendar} label="Joined" value={formatDate(user.createdAt)} />
                <InfoItem icon={Clock} label="Last Login" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'} />
              </div>
            </div>
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role History */}
          <Card>
            <CardHeader>
              <CardTitle>Roles & Assignments</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {user.roles.map((role) => (
                <div
                  key={role.name}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{role.displayName}</p>
                      <p className="text-xs text-gray-500">
                        Assigned {formatDate(role.assignedAt)}
                      </p>
                    </div>
                  </div>
                  {role.hostelId && (
                    <Badge variant="info">
                      <Building2 className="w-3 h-3 mr-1" />
                      Hostel Scoped
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <DetailRow label="User ID" value={user.id} mono />
              <DetailRow label="Status" value={formatStatus(user.status)} />
              <DetailRow label="Created" value={formatDateTime(user.createdAt)} />
              <DetailRow label="Updated" value={formatDateTime(user.updatedAt)} />
              <DetailRow
                label="Last Login"
                value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
              />
              <DetailRow
                label="Audit Logs"
                value={user._count?.auditLogs?.toString() || '0'}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editForm.firstName}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              value={editForm.lastName}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
            />
          </div>
          <Input
            label="Mobile Number"
            value={editForm.mobile}
            onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Change User Status"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Current status: <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'SUSPENDED' ? 'danger' : 'warning'}>{formatStatus(user.status)}</Badge>
          </p>
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={USER_STATUSES.map(s => ({ value: s.value, label: s.label }))}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button
              variant={newStatus === 'SUSPENDED' ? 'danger' : 'primary'}
              onClick={handleStatusChange}
              loading={saving}
            >
              {newStatus === 'SUSPENDED' ? (
                <><Ban className="w-4 h-4 mr-1" /> Suspend</>
              ) : newStatus === 'ACTIVE' ? (
                <><CheckCircle className="w-4 h-4 mr-1" /> Activate</>
              ) : (
                'Update Status'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {mono && value.length > 12 ? `${value.slice(0, 8)}...` : value}
      </span>
    </div>
  );
}
