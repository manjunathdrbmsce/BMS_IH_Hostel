export { default as apiClient, type ApiResponse, type PaginationMeta } from './client';
export { authApi, type User, type StudentProfile, type AuthTokens, type LoginResponse } from './auth.api';
export { leaveApi, type LeaveRequest, type LeaveEligibility } from './leave.api';
export {
  attendanceApi,
  type AttendanceRecord,
  type AttendanceStats,
  type AttendanceSession,
  type QRToken,
  type SessionLiveData,
  type PresenceBoard,
  type StudentDevice,
  type DeviceChangeRequest,
} from './attendance.api';
export { gateApi, type GateEntry, type GatePass } from './gate.api';
export { complaintsApi, type Complaint, type ComplaintComment } from './complaints.api';
export { noticesApi, type Notice } from './notices.api';
export { violationsApi, type Violation } from './violations.api';
export { notificationsApi, type Notification } from './notifications.api';
export { studentsApi, dashboardApi, type DashboardStats, type GuardianLink } from './students.api';
