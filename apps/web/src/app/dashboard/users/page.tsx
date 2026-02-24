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
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatStatus, statusColor, roleColor } from '@/lib/utils';
import { USER_STATUSES, ROLES } from '@/lib/constants';
import {
  Plus,
  Search,
  Download,
  UserPlus,
  Filter,
  Mail,
  Phone,
  Shield,
  Users as UsersIcon,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  mobile: string | null;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  roles: Array<{ name: string; displayName: string }>;
}

interface UsersResponse {
  success: boolean;
  data: User[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function UsersPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const canWrite = hasRole('SUPER_ADMIN', 'HOSTEL_ADMIN');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create user form state
  const [form, setForm] = useState({
    email: '', mobile: '', firstName: '', lastName: '', password: '', roles: ['STUDENT'] as string[],
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (roleFilter) params.set('role', roleFilter);

      const res = await api.get<UsersResponse>(`/users?${params.toString()}`);
      setUsers(res.data);
      setMeta(res.meta);
    } catch {
      addToast({ type: 'error', title: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, addToast]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post('/users', form);
      addToast({ type: 'success', title: 'User created successfully' });
      setShowCreateModal(false);
      setForm({ email: '', mobile: '', firstName: '', lastName: '', password: '', roles: ['STUDENT'] });
      fetchUsers(1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      addToast({ type: 'error', title: message });
    } finally {
      setCreating(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
          <div>
            <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <span
              key={r.name}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleColor(r.name)}`}
            >
              {r.displayName}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'mobile',
      label: 'Mobile',
      render: (user) => (
        <span className="text-gray-600">{user.mobile || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(user.status)}`}>
          {formatStatus(user.status)}
        </span>
      ),
    },
    {
      key: 'lastLoginAt',
      label: 'Last Login',
      sortable: true,
      render: (user) => (
        <span className="text-gray-500 text-xs">
          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      render: (user) => (
        <span className="text-gray-500 text-xs">{formatDate(user.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <Topbar
        title="User Management"
        subtitle={`${meta.total} total users`}
      />

      <div className="p-6 space-y-4 animate-in">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            {canWrite && (
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <UserPlus className="w-4 h-4 mr-1" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4 animate-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ value: '', label: 'All Statuses' }, ...USER_STATUSES]}
              />
              <Select
                label="Role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Roles' },
                  ...ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') })),
                ]}
              />
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('');
                    setRoleFilter('');
                    setSearch('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Table */}
        <Card>
          <DataTable<User>
            columns={columns}
            data={users}
            loading={loading}
            rowKey={(u) => u.id}
            onRowClick={(u) => router.push(`/dashboard/users/${u.id}`)}
            emptyMessage="No users found matching your criteria"
          />
          <div className="px-4 border-t border-gray-100">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={(p) => fetchUsers(p)}
            />
          </div>
        </Card>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="John"
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Doe"
              required
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="john.doe@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />
          <Input
            label="Mobile Number"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            placeholder="+91 98765 43210"
            leftIcon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Min 8 characters"
            leftIcon={<Shield className="w-4 h-4" />}
            required
          />
          <Select
            label="Primary Role"
            value={form.roles[0]}
            onChange={(e) => setForm({ ...form, roles: [e.target.value] })}
            options={ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              <UserPlus className="w-4 h-4 mr-1" />
              Create User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
