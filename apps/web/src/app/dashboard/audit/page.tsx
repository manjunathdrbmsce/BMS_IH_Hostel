'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Shield,
  LogIn,
  LogOut,
  UserPlus,
  AlertTriangle,
  Settings,
  RefreshCw,
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'USER_CREATE', label: 'User Create' },
  { value: 'USER_UPDATE', label: 'User Update' },
  { value: 'USER_DELETE', label: 'User Delete' },
  { value: 'USER_STATUS_CHANGE', label: 'Status Change' },
  { value: 'TOKEN_REFRESH', label: 'Token Refresh' },
  { value: 'ROLE_ASSIGN', label: 'Role Assign' },
  { value: 'HOSTEL_CREATE', label: 'Hostel Create' },
  { value: 'HOSTEL_UPDATE', label: 'Hostel Update' },
  { value: 'ROOM_CREATE', label: 'Room Create' },
  { value: 'ROOM_BULK_CREATE', label: 'Room Bulk Create' },
  { value: 'PASSWORD_CHANGE', label: 'Password Change' },
  { value: 'SYSTEM_CONFIG_UPDATE', label: 'Config Update' },
  { value: 'RATE_LIMIT_EXCEEDED', label: 'Rate Limit' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'auth', label: 'Auth' },
  { value: 'users', label: 'Users' },
  { value: 'hostels', label: 'Hostels' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'system', label: 'System' },
];

export default function AuditPage() {
  const { addToast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      });
      if (actionFilter) params.set('action', actionFilter);
      if (resourceFilter) params.set('resource', resourceFilter);
      if (search) params.set('userId', search);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) params.set('to', new Date(toDate).toISOString());

      const res = await api.get<{
        success: boolean;
        data: AuditLog[];
        meta: typeof meta;
      }>(`/audit/logs?${params.toString()}`);
      setLogs(res.data);
      setMeta(res.meta);
    } catch {
      addToast({ type: 'error', title: 'Failed to load audit logs' });
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceFilter, search, fromDate, toDate, addToast]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(1), 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const actionIcon = (action: string) => {
    if (action.includes('LOGIN') && !action.includes('FAILED'))
      return <LogIn className="w-3.5 h-3.5 text-emerald-600" />;
    if (action.includes('LOGOUT'))
      return <LogOut className="w-3.5 h-3.5 text-blue-600" />;
    if (action.includes('FAILED') || action.includes('RATE_LIMIT'))
      return <AlertTriangle className="w-3.5 h-3.5 text-red-600" />;
    if (action.includes('CREATE') || action.includes('ASSIGN'))
      return <UserPlus className="w-3.5 h-3.5 text-indigo-600" />;
    if (action.includes('UPDATE') || action.includes('CHANGE'))
      return <Settings className="w-3.5 h-3.5 text-amber-600" />;
    if (action.includes('REFRESH'))
      return <RefreshCw className="w-3.5 h-3.5 text-gray-500" />;
    return <Shield className="w-3.5 h-3.5 text-gray-500" />;
  };

  const actionVariant = (action: string): 'success' | 'danger' | 'warning' | 'info' | 'default' => {
    if (action.includes('FAILED') || action.includes('RATE_LIMIT') || action.includes('DELETE'))
      return 'danger';
    if (action.includes('LOGIN') && !action.includes('FAILED'))
      return 'success';
    if (action.includes('CREATE') || action.includes('ASSIGN'))
      return 'info';
    if (action.includes('UPDATE') || action.includes('CHANGE'))
      return 'warning';
    return 'default';
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      label: 'Time',
      sortable: true,
      render: (log) => (
        <div>
          <p className="text-sm text-gray-900">{formatRelativeTime(log.createdAt)}</p>
          <p className="text-[10px] text-gray-400">{formatDateTime(log.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (log) =>
        log.user ? (
          <div className="flex items-center gap-2">
            <Avatar name={`${log.user.firstName} ${log.user.lastName}`} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {log.user.firstName} {log.user.lastName}
              </p>
              <p className="text-[10px] text-gray-500">{log.user.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">System</span>
        ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (log) => (
        <div className="flex items-center gap-2">
          {actionIcon(log.action)}
          <Badge variant={actionVariant(log.action)}>
            {log.action.replace(/_/g, ' ')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'resource',
      label: 'Resource',
      render: (log) => (
        <Badge variant="default">{log.resource}</Badge>
      ),
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (log) => (
        <span className="text-xs font-mono text-gray-500">
          {log.ipAddress || '—'}
        </span>
      ),
    },
    {
      key: 'details',
      label: 'Details',
      render: (log) =>
        log.details ? (
          <span
            className="text-xs text-gray-500 truncate max-w-[200px] block cursor-help"
            title={JSON.stringify(log.details, null, 2)}
          >
            {JSON.stringify(log.details).slice(0, 50)}...
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="min-h-screen">
      <Topbar
        title="Audit Logs"
        subtitle={`${meta.total} total records`}
      />

      <div className="p-6 space-y-4 animate-in">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user ID..."
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
          <Button variant="outline" size="sm" onClick={() => fetchLogs(meta.page)}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4 animate-in">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Select
                label="Action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                options={ACTION_OPTIONS}
              />
              <Select
                label="Resource"
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                options={RESOURCE_OPTIONS}
              />
              <Input
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <Input
                label="To Date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActionFilter('');
                    setResourceFilter('');
                    setFromDate('');
                    setToDate('');
                    setSearch('');
                  }}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Table */}
        <Card>
          <DataTable<AuditLog>
            columns={columns}
            data={logs}
            loading={loading}
            loadingRows={12}
            rowKey={(l) => l.id}
            emptyMessage="No audit logs found"
          />
          <div className="px-4 border-t border-gray-100">
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={(p) => fetchLogs(p)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
