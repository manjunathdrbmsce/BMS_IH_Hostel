/**
 * BMS Hostel RBAC role constants.
 * Must match the backend Prisma `Role` enum.
 */
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HOSTEL_ADMIN: 'HOSTEL_ADMIN',
  WARDEN: 'WARDEN',
  DEPUTY_WARDEN: 'DEPUTY_WARDEN',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  SECURITY_GUARD: 'SECURITY_GUARD',
  MAINTENANCE_STAFF: 'MAINTENANCE_STAFF',
  ACCOUNTANT: 'ACCOUNTANT',
  MEDICAL_OFFICER: 'MEDICAL_OFFICER',
  MESS_MANAGER: 'MESS_MANAGER',
} as const;

export type RoleName = (typeof Role)[keyof typeof Role];

/** Maps a primary role to its navigator group (expo-router route group). */
export function getNavigatorGroup(roles: RoleName[]): string {
  if (!roles || roles.length === 0) return '(auth)';

  // Priority order: admin/warden first, then specific roles
  if (
    roles.includes(Role.SUPER_ADMIN) ||
    roles.includes(Role.HOSTEL_ADMIN) ||
    roles.includes(Role.WARDEN) ||
    roles.includes(Role.DEPUTY_WARDEN)
  ) {
    return '(warden)';
  }
  if (roles.includes(Role.SECURITY_GUARD)) return '(security)';
  if (roles.includes(Role.PARENT)) return '(parent)';
  if (roles.includes(Role.STUDENT)) return '(student)';

  return '(auth)';
}

// ── Backend enums (for type-safety in the mobile app) ──

export const LeaveType = {
  HOME: 'HOME',
  MEDICAL: 'MEDICAL',
  EMERGENCY: 'EMERGENCY',
  OTHER: 'OTHER',
} as const;
export type LeaveTypeName = (typeof LeaveType)[keyof typeof LeaveType];

export const LeaveStatus = {
  PENDING: 'PENDING',
  PARENT_APPROVED: 'PARENT_APPROVED',
  PARENT_REJECTED: 'PARENT_REJECTED',
  WARDEN_APPROVED: 'WARDEN_APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type LeaveStatusName = (typeof LeaveStatus)[keyof typeof LeaveStatus];

export const ComplaintCategory = {
  MAINTENANCE: 'MAINTENANCE',
  ELECTRICAL: 'ELECTRICAL',
  PLUMBING: 'PLUMBING',
  MESS: 'MESS',
  HYGIENE: 'HYGIENE',
  SECURITY: 'SECURITY',
  OTHER: 'OTHER',
} as const;
export type ComplaintCategoryName = (typeof ComplaintCategory)[keyof typeof ComplaintCategory];

export const ComplaintStatus = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
} as const;
export type ComplaintStatusName = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

export const ComplaintPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const NoticePriority = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  URGENT: 'URGENT',
} as const;
export type NoticePriorityName = (typeof NoticePriority)[keyof typeof NoticePriority];

export const GatePassStatus = {
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type GatePassStatusName = (typeof GatePassStatus)[keyof typeof GatePassStatus];

export const ViolationType = {
  LATE_ENTRY: 'LATE_ENTRY',
  OVERSTAY: 'OVERSTAY',
  EARLY_EXIT: 'EARLY_EXIT',
} as const;
export type ViolationTypeName = (typeof ViolationType)[keyof typeof ViolationType];

export const EscalationState = {
  NONE: 'NONE',
  WARNED: 'WARNED',
  ESCALATED: 'ESCALATED',
  RESOLVED: 'RESOLVED',
} as const;

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  ON_LEAVE: 'ON_LEAVE',
  LATE: 'LATE',
  UNKNOWN: 'UNKNOWN',
} as const;
export type AttendanceStatusName = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const SessionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export const DeviceRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
