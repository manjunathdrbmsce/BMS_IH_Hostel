import { type RoleName, Role } from '@/constants';

/**
 * Check if a set of roles includes a specific role.
 */
export function hasRole(roles: RoleName[], role: RoleName): boolean {
  return roles.includes(role);
}

/**
 * Check if a user has any admin-level role.
 */
export function isAdmin(roles: RoleName[]): boolean {
  return roles.some((r) =>
    [Role.SUPER_ADMIN, Role.HOSTEL_ADMIN].includes(r as any),
  );
}

/**
 * Check if a user has any warden-level role (warden or deputy).
 */
export function isWarden(roles: RoleName[]): boolean {
  return roles.some((r) =>
    [Role.SUPER_ADMIN, Role.HOSTEL_ADMIN, Role.WARDEN, Role.DEPUTY_WARDEN].includes(r as any),
  );
}

/**
 * Check if a user can approve leaves.
 */
export function canApproveLeave(roles: RoleName[]): boolean {
  return roles.some((r) =>
    [Role.SUPER_ADMIN, Role.HOSTEL_ADMIN, Role.WARDEN, Role.PARENT].includes(r as any),
  );
}

/**
 * Check if a user can manage gate entries.
 */
export function canManageGate(roles: RoleName[]): boolean {
  return roles.some((r) =>
    [Role.SUPER_ADMIN, Role.HOSTEL_ADMIN, Role.WARDEN, Role.SECURITY_GUARD].includes(r as any),
  );
}

/**
 * Gets a display label for a role.
 */
export function getRoleLabel(role: RoleName): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    HOSTEL_ADMIN: 'Hostel Admin',
    WARDEN: 'Warden',
    DEPUTY_WARDEN: 'Deputy Warden',
    STUDENT: 'Student',
    PARENT: 'Parent',
    SECURITY_GUARD: 'Security Guard',
    MAINTENANCE_STAFF: 'Maintenance',
    ACCOUNTANT: 'Accountant',
    MEDICAL_OFFICER: 'Medical Officer',
    MESS_MANAGER: 'Mess Manager',
  };
  return labels[role] ?? role;
}
