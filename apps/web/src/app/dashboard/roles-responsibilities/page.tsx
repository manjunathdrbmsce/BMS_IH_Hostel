'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Shield, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

type AccessType = 'NORMAL' | 'VISIBILITY' | 'OVERRIDE' | 'ON_BEHALF' | 'REVIEW';

interface SuperAdminPermission {
  module: string;
  feature: string;
  key: string;
  accessType: AccessType;
  scope: 'GLOBAL' | 'HOSTEL';
  note: string;
  defaultEnabled: boolean;
  locked?: boolean;
}

const STORAGE_KEY = 'bms.super-admin.roles-responsibilities.v1';
const CHANGE_EVENT = 'super-admin-permissions-change';

const SUPER_ADMIN_PERMISSIONS: SuperAdminPermission[] = [
  {
    module: 'Authentication',
    feature: 'Login and access Super Admin dashboard',
    key: 'AUTH_LOGIN',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Required for Super Admin access. This control is locked on.',
    defaultEnabled: true,
    locked: true,
  },
  {
    module: 'Dashboard',
    feature: 'View all dashboard stats',
    key: 'DASHBOARD_VIEW_GLOBAL',
    accessType: 'VISIBILITY',
    scope: 'GLOBAL',
    note: 'Global dashboard visibility across all hostels and modules.',
    defaultEnabled: true,
  },
  {
    module: 'User Management',
    feature: 'Add users with any role',
    key: 'USER_CREATE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Administrative user creation.',
    defaultEnabled: true,
  },
  {
    module: 'User Management',
    feature: 'Export users',
    key: 'USER_EXPORT',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Exports user records for reporting.',
    defaultEnabled: true,
  },
  {
    module: 'User Management',
    feature: 'Assign and manage roles',
    key: 'ROLE_ASSIGN',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Required for administrative role assignment.',
    defaultEnabled: true,
  },
  {
    module: 'Building Management',
    feature: 'Create buildings and view status/stats',
    key: 'BUILDING_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Covers active, inactive, maintenance, and construction states.',
    defaultEnabled: true,
  },
  {
    module: 'Hostel Management',
    feature: 'Create hostels and view hostel stats',
    key: 'HOSTEL_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Covers code, building, type, capacity, status, and dashboard stats.',
    defaultEnabled: true,
  },
  {
    module: 'Hostel Management',
    feature: 'Assign warden to hostel',
    key: 'WARDEN_ASSIGN',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'One warden can manage multiple hostels; one hostel should have one active warden.',
    defaultEnabled: true,
  },
  {
    module: 'Room Management',
    feature: 'View room stats and update room status',
    key: 'ROOM_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Covers total, available, and maintenance rooms.',
    defaultEnabled: true,
  },
  {
    module: 'Policy Management',
    feature: 'Create building policy and view active policies',
    key: 'POLICY_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Policy is attached to a building and active policies are visible.',
    defaultEnabled: true,
  },
  {
    module: 'Students',
    feature: 'Create student profile and view student stats',
    key: 'STUDENT_PROFILE_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Admin-created student profiles should be auditable.',
    defaultEnabled: true,
  },
  {
    module: 'Allotments',
    feature: 'Assign, transfer, and vacate beds',
    key: 'ALLOTMENT_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Covers active, transferred, and vacated bed actions.',
    defaultEnabled: true,
  },
  {
    module: 'Hostel Registration',
    feature: 'View registration status and stats',
    key: 'REGISTRATION_VIEW',
    accessType: 'VISIBILITY',
    scope: 'GLOBAL',
    note: 'Read/status visibility for applications.',
    defaultEnabled: true,
  },
  {
    module: 'Hostel Registration',
    feature: 'Edit student draft application',
    key: 'REGISTRATION_DRAFT_EDIT',
    accessType: 'REVIEW',
    scope: 'GLOBAL',
    note: 'Needs strict audit/reason before this should become a normal action.',
    defaultEnabled: false,
  },
  {
    module: 'Leave Management',
    feature: 'View leave dashboard stats',
    key: 'LEAVE_STATS_VIEW',
    accessType: 'VISIBILITY',
    scope: 'GLOBAL',
    note: 'Global leave analytics.',
    defaultEnabled: true,
  },
  {
    module: 'Leave Management',
    feature: 'Override parent approval',
    key: 'LEAVE_PARENT_OVERRIDE',
    accessType: 'OVERRIDE',
    scope: 'GLOBAL',
    note: 'Must be recorded as admin override, not real parent consent.',
    defaultEnabled: false,
  },
  {
    module: 'Leave Management',
    feature: 'Final approve/reject leave',
    key: 'LEAVE_ADMIN_DECIDE',
    accessType: 'OVERRIDE',
    scope: 'GLOBAL',
    note: 'Should require reason and audit when acting instead of assigned warden.',
    defaultEnabled: true,
  },
  {
    module: 'Gate Management',
    feature: 'View stats, log entry, and issue gate pass',
    key: 'GATE_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Gate actions should be audited.',
    defaultEnabled: true,
  },
  {
    module: 'Attendance',
    feature: 'View attendance stats',
    key: 'ATTENDANCE_STATS_VIEW',
    accessType: 'VISIBILITY',
    scope: 'GLOBAL',
    note: 'Global attendance visibility.',
    defaultEnabled: true,
  },
  {
    module: 'Roll Call',
    feature: 'Start roll call for selected hostel',
    key: 'ROLL_CALL_CREATE',
    accessType: 'NORMAL',
    scope: 'HOSTEL',
    note: 'Super Admin can select any hostel, but each session remains hostel-scoped.',
    defaultEnabled: true,
  },
  {
    module: 'Roll Call',
    feature: 'View and cancel roll-call session',
    key: 'ROLL_CALL_MANAGE',
    accessType: 'OVERRIDE',
    scope: 'HOSTEL',
    note: 'Session QR/live/cancel should validate hostel scope and record actor.',
    defaultEnabled: true,
  },
  {
    module: 'Violations',
    feature: 'View stats and resolve violation',
    key: 'VIOLATION_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Resolver should be recorded.',
    defaultEnabled: true,
  },
  {
    module: 'Complaints',
    feature: 'View stats and resolve complaints',
    key: 'COMPLAINT_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Admin resolution is allowed and should be audited.',
    defaultEnabled: true,
  },
  {
    module: 'Complaints',
    feature: 'File complaint on behalf of student',
    key: 'COMPLAINT_CREATE_ON_BEHALF',
    accessType: 'ON_BEHALF',
    scope: 'GLOBAL',
    note: 'Must not appear as if the student directly filed it.',
    defaultEnabled: false,
  },
  {
    module: 'Notices',
    feature: 'Publish and deactivate notices',
    key: 'NOTICE_MANAGE',
    accessType: 'NORMAL',
    scope: 'GLOBAL',
    note: 'Normal Super Admin communication action.',
    defaultEnabled: true,
  },
];

const accessTypeLabels: Record<AccessType, string> = {
  NORMAL: 'Normal',
  VISIBILITY: 'Visibility',
  OVERRIDE: 'Override',
  ON_BEHALF: 'On behalf',
  REVIEW: 'Review',
};

const accessTypeBadge: Record<AccessType, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  NORMAL: 'success',
  VISIBILITY: 'info',
  OVERRIDE: 'danger',
  ON_BEHALF: 'warning',
  REVIEW: 'warning',
};

function defaultState() {
  return Object.fromEntries(SUPER_ADMIN_PERMISSIONS.map((item) => [item.key, item.defaultEnabled]));
}

export default function RolesResponsibilitiesPage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(defaultState);
  const [activeType, setActiveType] = useState<AccessType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const isSuperAdmin = hasRole('SUPER_ADMIN');

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: Array<{ name: string; enabled: boolean }>;
        }>('/roles-responsibilities/super-admin');
        const next = {
          ...defaultState(),
          ...Object.fromEntries(res.data.map((item) => [item.name, item.enabled])),
        };
        setEnabled(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(CHANGE_EVENT));
      } catch {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setEnabled({ ...defaultState(), ...JSON.parse(stored) });
          }
        } catch {
          setEnabled(defaultState());
        }
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const filteredPermissions = useMemo(
    () =>
      activeType === 'ALL'
        ? SUPER_ADMIN_PERMISSIONS
        : SUPER_ADMIN_PERMISSIONS.filter((item) => item.accessType === activeType),
    [activeType],
  );

  const enabledCount = SUPER_ADMIN_PERMISSIONS.filter((item) => enabled[item.key]).length;
  const overrideCount = SUPER_ADMIN_PERMISSIONS.filter(
    (item) => ['OVERRIDE', 'ON_BEHALF', 'REVIEW'].includes(item.accessType) && enabled[item.key],
  ).length;

  const saveState = (next: Record<string, boolean>) => {
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const togglePermission = async (item: SuperAdminPermission) => {
    if (item.locked) return;
    const nextEnabled = !enabled[item.key];
    const optimistic = { ...enabled, [item.key]: nextEnabled };

    setSavingKey(item.key);
    saveState(optimistic);

    try {
      const res = await api.patch<{
        success: boolean;
        data: Array<{ name: string; enabled: boolean }>;
      }>('/roles-responsibilities/super-admin', {
        permission: item.key,
        enabled: nextEnabled,
      });
      const next = {
        ...defaultState(),
        ...Object.fromEntries(res.data.map((permission) => [permission.name, permission.enabled])),
      };
      saveState(next);
      addToast({
        type: 'success',
        title: `${item.key} ${nextEnabled ? 'enabled' : 'disabled'}`,
      });
    } catch (err) {
      saveState(enabled);
      addToast({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to update permission',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const resetDefaults = async () => {
    const next = defaultState();
    setSavingKey('RESET');

    try {
      let latest = next;
      for (const item of SUPER_ADMIN_PERMISSIONS.filter((permission) => !permission.locked)) {
        const res = await api.patch<{
          success: boolean;
          data: Array<{ name: string; enabled: boolean }>;
        }>('/roles-responsibilities/super-admin', {
          permission: item.key,
          enabled: item.defaultEnabled,
        });
        latest = {
          ...defaultState(),
          ...Object.fromEntries(res.data.map((permission) => [permission.name, permission.enabled])),
        };
      }
      saveState(latest);
      addToast({ type: 'success', title: 'Super Admin permissions reset to defaults' });
    } catch (err) {
      addToast({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to reset permissions',
      });
    } finally {
      setSavingKey(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Topbar title="Roles & Responsibilities" subtitle="Super Admin access required" />
        <div className="p-6">
          <div className="border border-red-200 bg-red-50 rounded-lg p-5 text-red-700">
            This page is available only for Super Admin users.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar
        title="Roles & Responsibilities"
        subtitle="Control Super Admin feature availability"
      >
        <Button variant="outline" size="sm" onClick={resetDefaults} loading={savingKey === 'RESET'}>
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </Topbar>

      <div className="p-6 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-semibold text-gray-900">Super Admin</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Enabled features</p>
                <p className="font-semibold text-gray-900">
                  {enabledCount} / {SUPER_ADMIN_PERMISSIONS.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sensitive enabled</p>
                <p className="font-semibold text-gray-900">{overrideCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
          These toggles are stored in the backend role-permission mapping. Mapped Super Admin API requests
          are blocked when the matching permission is disabled.
        </section>

        <section className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Super Admin Feature Toggles</h3>
              <p className="text-sm text-gray-500">Turn features on or off for the Super Admin role.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'NORMAL', 'VISIBILITY', 'OVERRIDE', 'ON_BEHALF', 'REVIEW'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium border transition',
                    activeType === type
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {type === 'ALL' ? 'All' : accessTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">Loading permissions...</div>
            ) : filteredPermissions.map((item) => (
              <div key={item.key} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {item.module}
                    </span>
                    <Badge variant={accessTypeBadge[item.accessType]}>
                      {accessTypeLabels[item.accessType]}
                    </Badge>
                    <Badge variant="default">{item.scope}</Badge>
                    {item.locked && <Badge variant="info">Locked</Badge>}
                  </div>
                  <h4 className="font-medium text-gray-900">{item.feature}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-mono text-gray-700">{item.key}</span>
                    <span className="mx-2">-</span>
                    {item.note}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => togglePermission(item)}
                  disabled={item.locked}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60',
                    enabled[item.key] ? 'bg-indigo-600' : 'bg-gray-300',
                    savingKey === item.key && 'opacity-70',
                  )}
                  aria-label={`Toggle ${item.key}`}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                      enabled[item.key] ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Next Enforcement Step</h3>
          </div>
          <p className="text-sm text-gray-600">
            Connect these permission keys to backend guards and navigation checks. Super Admin should retain a
            recovery-safe account path, while sensitive actions such as parent approval override and complaint
            creation on behalf of a student must require reason and audit records.
          </p>
        </section>
      </div>
    </div>
  );
}
