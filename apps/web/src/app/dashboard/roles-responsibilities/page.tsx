'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  LockKeyhole,
  Pencil,
  RotateCcw,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

type AccessType = 'NORMAL' | 'VISIBILITY' | 'OVERRIDE' | 'ON_BEHALF' | 'REVIEW';
type RoleKey = 'SUPER_ADMIN' | 'HOSTEL_ADMIN' | 'WARDEN';
type PermissionAction =
  | 'View'
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Export'
  | 'Assign'
  | 'Approve'
  | 'Override'
  | 'Resolve'
  | 'Publish'
  | 'Other';

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
const ROLE_DETAILS_STORAGE_KEY = 'bms.roles-permissions.role-details.v1';

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

function defaultState() {
  return Object.fromEntries(SUPER_ADMIN_PERMISSIONS.map((item) => [item.key, item.defaultEnabled]));
}

const roleDefinitions: Array<{
  key: RoleKey;
  defaultDisplayName: string;
  defaultDescription: string;
  defaultColor: string;
  status: string;
  icon: React.ElementType;
  editable: boolean;
}> = [
  {
    key: 'SUPER_ADMIN',
    defaultDisplayName: 'Super Admin',
    defaultDescription: 'Highest-level role for global administration, recovery-safe access, and cross-hostel control.',
    defaultColor: '#4f46e5',
    status: 'Editable',
    icon: Shield,
    editable: true,
  },
  {
    key: 'HOSTEL_ADMIN',
    defaultDisplayName: 'Hostel Admin',
    defaultDescription: 'Operational admin role for hostel management workflows. Permission controls are planned later.',
    defaultColor: '#0891b2',
    status: 'Coming soon',
    icon: Building2,
    editable: false,
  },
  {
    key: 'WARDEN',
    defaultDisplayName: 'Warden',
    defaultDescription: 'Hostel-facing role for assigned hostel supervision, student workflows, and approvals.',
    defaultColor: '#16a34a',
    status: 'Coming soon',
    icon: ShieldCheck,
    editable: false,
  },
];

const permissionActionColumns: PermissionAction[] = [
  'View',
  'Create',
  'Update',
  'Delete',
  'Export',
  'Assign',
  'Approve',
  'Override',
  'Resolve',
  'Publish',
  'Other',
];

const permissionActionByKey: Record<string, PermissionAction> = {
  AUTH_LOGIN: 'Other',
  DASHBOARD_VIEW_GLOBAL: 'View',
  USER_CREATE: 'Create',
  USER_EXPORT: 'Export',
  ROLE_ASSIGN: 'Assign',
  BUILDING_MANAGE: 'Update',
  HOSTEL_MANAGE: 'Update',
  WARDEN_ASSIGN: 'Assign',
  ROOM_MANAGE: 'Update',
  POLICY_MANAGE: 'Create',
  STUDENT_PROFILE_MANAGE: 'Create',
  ALLOTMENT_MANAGE: 'Assign',
  REGISTRATION_VIEW: 'View',
  REGISTRATION_DRAFT_EDIT: 'Update',
  LEAVE_STATS_VIEW: 'View',
  LEAVE_PARENT_OVERRIDE: 'Override',
  LEAVE_ADMIN_DECIDE: 'Approve',
  GATE_MANAGE: 'Create',
  ATTENDANCE_STATS_VIEW: 'View',
  ROLL_CALL_CREATE: 'Create',
  ROLL_CALL_MANAGE: 'Override',
  VIOLATION_MANAGE: 'Resolve',
  COMPLAINT_MANAGE: 'Resolve',
  COMPLAINT_CREATE_ON_BEHALF: 'Create',
  NOTICE_MANAGE: 'Publish',
};

const permissionUiLabelByKey: Record<string, string> = {
  AUTH_LOGIN: 'Access admin login',
  DASHBOARD_VIEW_GLOBAL: 'View dashboard',
  USER_CREATE: 'Create user',
  USER_EXPORT: 'Export users',
  ROLE_ASSIGN: 'Assign roles',
  BUILDING_MANAGE: 'Manage buildings',
  HOSTEL_MANAGE: 'Manage hostels',
  WARDEN_ASSIGN: 'Assign warden',
  ROOM_MANAGE: 'Update rooms',
  POLICY_MANAGE: 'Create policies',
  STUDENT_PROFILE_MANAGE: 'Create student profile',
  ALLOTMENT_MANAGE: 'Assign or transfer beds',
  REGISTRATION_VIEW: 'View registrations',
  REGISTRATION_DRAFT_EDIT: 'Update draft application',
  LEAVE_STATS_VIEW: 'View leave stats',
  LEAVE_PARENT_OVERRIDE: 'Override parent approval',
  LEAVE_ADMIN_DECIDE: 'Approve or reject leave',
  GATE_MANAGE: 'Manage gate records',
  ATTENDANCE_STATS_VIEW: 'View attendance',
  ROLL_CALL_CREATE: 'Create roll call',
  ROLL_CALL_MANAGE: 'Manage roll call',
  VIOLATION_MANAGE: 'Resolve violations',
  COMPLAINT_MANAGE: 'Resolve complaints',
  COMPLAINT_CREATE_ON_BEHALF: 'Create complaint',
  NOTICE_MANAGE: 'Publish notices',
};

const colorOptions = ['#4f46e5', '#0891b2', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'];

function defaultRoleDetails() {
  return Object.fromEntries(
    roleDefinitions.map((role) => [
      role.key,
      {
        displayName: role.defaultDisplayName,
        description: role.defaultDescription,
        color: role.defaultColor,
      },
    ]),
  ) as Record<RoleKey, { displayName: string; description: string; color: string }>;
}

export default function RolesResponsibilitiesPage() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(defaultState);
  const [activeType, setActiveType] = useState<AccessType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [roleUserCounts, setRoleUserCounts] = useState<Partial<Record<RoleKey, number>>>({});
  const [roleDetails, setRoleDetails] = useState(defaultRoleDetails);

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

  useEffect(() => {
    const loadRoleUserCounts = async () => {
      const counts: Partial<Record<RoleKey, number>> = {};

      await Promise.all(
        roleDefinitions.map(async (role) => {
          try {
            const res = await api.get<{
              success: boolean;
              meta?: { total: number };
            }>(`/users?role=${role.key}&limit=1`);
            counts[role.key] = res.meta?.total ?? 0;
          } catch {
            counts[role.key] = 0;
          }
        }),
      );

      setRoleUserCounts(counts);
    };

    loadRoleUserCounts();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROLE_DETAILS_STORAGE_KEY);
      if (stored) {
        setRoleDetails({ ...defaultRoleDetails(), ...JSON.parse(stored) });
      }
    } catch {
      setRoleDetails(defaultRoleDetails());
    }
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
  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, SuperAdminPermission[]>();

    for (const permission of filteredPermissions) {
      const existing = groups.get(permission.module) ?? [];
      existing.push(permission);
      groups.set(permission.module, existing);
    }

    return Array.from(groups.entries()).map(([module, permissions]) => ({ module, permissions }));
  }, [filteredPermissions]);

  const updateRoleDetail = (
    role: RoleKey,
    field: 'displayName' | 'description' | 'color',
    value: string,
  ) => {
    setRoleDetails((current) => {
      const next = {
        ...current,
        [role]: {
          ...current[role],
          [field]: value,
        },
      };
      localStorage.setItem(ROLE_DETAILS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

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
        <Topbar title="Roles & Permissions" subtitle="Super Admin access required" />
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
        title="Roles & Permissions"
        subtitle="Review roles and manage Super Admin permissions"
      >
        {selectedRole === 'SUPER_ADMIN' && (
          <Button variant="outline" size="sm" onClick={resetDefaults} loading={savingKey === 'RESET'}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        )}
      </Topbar>

      <div className="p-6 space-y-6">
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {roleDefinitions.map((role) => {
            const Icon = role.icon;
            const permissionCount = role.key === 'SUPER_ADMIN' ? enabledCount : null;
            const detail = roleDetails[role.key];

            return (
              <article
                key={role.key}
                className={cn(
                  'bg-white border rounded-lg p-5 transition flex flex-col gap-5',
                  selectedRole === role.key
                    ? 'border-indigo-200 shadow-sm shadow-indigo-100'
                    : 'border-gray-200',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        selectedRole === role.key ? 'text-white' : 'text-white opacity-80',
                      )}
                      style={{ backgroundColor: detail.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-h-6 flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{detail.displayName}</h3>
                        <Badge variant={role.editable ? 'success' : 'default'}>{role.status}</Badge>
                      </div>
                      <p className="mt-2 min-h-10 text-sm leading-5 text-gray-500">{detail.description}</p>
                    </div>
                  </div>
                  {!role.editable && <LockKeyhole className="w-4 h-4 text-gray-400 shrink-0" />}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Users</p>
                    <p className="text-sm font-medium text-gray-900">{roleUserCounts[role.key] ?? 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Permissions allotted</p>
                    <p className="text-sm font-medium text-gray-900">
                      {permissionCount === null ? 'Not configured' : permissionCount}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={role.editable ? 'primary' : 'outline'}
                  size="sm"
                  disabled={!role.editable}
                  onClick={() => setSelectedRole(role.key)}
                  className="mt-auto w-fit"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              </article>
            );
          })}
        </section>

        {selectedRole !== 'SUPER_ADMIN' && (
          <section className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-600">
            Select <span className="font-medium text-gray-900">Edit</span> on the Super Admin card to manage the
            currently implemented permission controls.
          </section>
        )}

        {selectedRole === 'SUPER_ADMIN' && (
        <>
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex flex-col lg:flex-row lg:items-start gap-5 justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Role Details</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Edit the role label, description, and visual color shown on this page.
                </p>
              </div>
              <Badge variant="info">Frontend role profile</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_220px] gap-4 mt-5 items-start">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Display name</span>
                <input
                  value={roleDetails.SUPER_ADMIN.displayName}
                  onChange={(event) => updateRoleDetail('SUPER_ADMIN', 'displayName', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">Description</span>
                <textarea
                  value={roleDetails.SUPER_ADMIN.description}
                  onChange={(event) => updateRoleDetail('SUPER_ADMIN', 'description', event.target.value)}
                  rows={3}
                  className="mt-1 block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm leading-5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>

              <div>
                <span className="text-xs font-medium text-gray-600">Role color</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => updateRoleDetail('SUPER_ADMIN', 'color', color)}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition',
                        roleDetails.SUPER_ADMIN.color === color ? 'border-gray-900' : 'border-white shadow-sm',
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Use role color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={roleDetails.SUPER_ADMIN.color}
                    onChange={(event) => updateRoleDetail('SUPER_ADMIN', 'color', event.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white"
                    aria-label="Custom role color"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Permissions</h3>
              <p className="text-sm text-gray-500">
                Review each module and enable only the actions this role should have.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">Sensitive enabled: {overrideCount}</Badge>
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

          <div>
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">Loading permissions...</div>
            ) : (
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-700 w-56">Module</th>
                    <th className="px-5 py-3 font-semibold text-gray-700">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupedPermissions.map((group) => (
                    <tr key={group.module} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{group.module}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {group.permissions.filter((permission) => enabled[permission.key]).length} / {group.permissions.length} enabled
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {permissionActionColumns.filter((action) =>
                            group.permissions.some((permission) => permissionActionByKey[permission.key] === action),
                          ).map((action) => {
                            const permissionsForAction = group.permissions.filter(
                              (permission) => permissionActionByKey[permission.key] === action,
                            );

                            if (permissionsForAction.length === 0) {
                              return (
                                <div key={action} className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-300">
                                  {action}
                                </div>
                              );
                            }

                            return (
                              <div key={action} className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{action}</p>
                                <div className="space-y-2">
                                  {permissionsForAction.map((item) => (
                                    <label
                                      key={item.key}
                                      className={cn(
                                        'flex items-start gap-2 text-xs',
                                        item.locked ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700',
                                        savingKey === item.key && 'opacity-70',
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!!enabled[item.key]}
                                        disabled={item.locked}
                                        onChange={() => togglePermission(item)}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-indigo-600 disabled:cursor-not-allowed"
                                      />
                                      <span>
                                        <span className="block font-medium text-gray-800">
                                          {permissionUiLabelByKey[item.key] ?? item.feature}
                                        </span>
                                        <span className="block text-[10px] text-gray-400">
                                          {item.scope.toLowerCase()} scope
                                          {item.locked ? ' · locked' : ''}
                                        </span>
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </section>
        </>
        )}

        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Next Role Expansion</h3>
          </div>
          <p className="text-sm text-gray-600">
            Hostel Admin is shown as a role card for planning only. The current editable permissions and backend
            enforcement still apply to Super Admin; Hostel Admin permission toggles can be added later with scoped
            checks, audit rules, and separate defaults.
          </p>
        </section>
      </div>
    </div>
  );
}
