// ============================================================================
// BMS Hostel Platform - Shared Types
// Phase 0/1: Identity, Authentication, Authorization
// ============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSTEL_ADMIN = 'HOSTEL_ADMIN',
  WARDEN = 'WARDEN',
  DEPUTY_WARDEN = 'DEPUTY_WARDEN',
  ACCOUNTS_OFFICER = 'ACCOUNTS_OFFICER',
  MESS_MANAGER = 'MESS_MANAGER',
  MESS_STAFF = 'MESS_STAFF',
  SECURITY_GUARD = 'SECURITY_GUARD',
  MAINTENANCE_STAFF = 'MAINTENANCE_STAFF',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export enum Permission {
  // Users
  USER_CREATE = 'USER_CREATE',
  USER_READ = 'USER_READ',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_LIST = 'USER_LIST',

  // Roles
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  ROLE_REVOKE = 'ROLE_REVOKE',

  // Hostel management (Phase 2+)
  HOSTEL_MANAGE = 'HOSTEL_MANAGE',
  ROOM_MANAGE = 'ROOM_MANAGE',
  ALLOTMENT_MANAGE = 'ALLOTMENT_MANAGE',

  // Finance (Phase 4+)
  FINANCE_MANAGE = 'FINANCE_MANAGE',
  PAYMENT_VIEW = 'PAYMENT_VIEW',

  // Gate (Phase 5+)
  GATE_OPERATE = 'GATE_OPERATE',
  LEAVE_APPROVE = 'LEAVE_APPROVE',

  // Mess (Phase 6+)
  MESS_MANAGE = 'MESS_MANAGE',
  MESS_SCAN = 'MESS_SCAN',

  // Complaints (Phase 7+)
  COMPLAINT_MANAGE = 'COMPLAINT_MANAGE',

  // Notices
  NOTICE_PUBLISH = 'NOTICE_PUBLISH',

  // Reports
  REPORT_VIEW = 'REPORT_VIEW',

  // Audit
  AUDIT_VIEW = 'AUDIT_VIEW',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  ROLE_REVOKE = 'ROLE_REVOKE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
}

// ---------------------------------------------------------------------------
// Auth DTOs
// ---------------------------------------------------------------------------

export interface LoginRequest {
  identifier: string; // email, mobile, or USN
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  mobile: string | null;
  firstName: string;
  lastName: string;
  roles: Role[];
  status: UserStatus;
}

// ---------------------------------------------------------------------------
// API Response Envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
