import apiClient, { type ApiResponse, type PaginationMeta } from './client';
import type { AttendanceStatusName } from '@/constants';

// ── Types ──

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatusName;
  firstIn: string | null;
  lastOut: string | null;
  source: string;
  sessionId: string | null;
  createdAt: string;
}

export interface AttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  percentage: number;
}

export interface AttendanceSession {
  id: string;
  hostelId: string;
  title: string | null;
  /** Alias for title */
  name?: string | null;
  status: string;
  gpsLat: number;
  gpsLng: number;
  gpsRadiusM: number;
  durationMin: number;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  presentCount?: number;
  absentCount?: number;
  totalStudents?: number;
}

export interface QRToken {
  token: string;
  expiresIn: number;
}

export interface SessionLiveData {
  session: AttendanceSession;
  presentStudents: Array<{
    id: string;
    user: { firstName: string; lastName: string; usn: string | null };
    markedAt: string;
  }>;
}

export interface PresenceBoard {
  inHostel: number;
  outCampus: number;
  onLeave: number;
}

export interface StudentDevice {
  id: string;
  studentId: string;
  fingerprint: string;
  deviceName: string | null;
  platform: string | null;
  registeredAt: string;
}

export interface DeviceChangeRequest {
  id: string;
  studentId: string;
  status: string;
  newFingerprint: string;
  newDeviceName: string | null;
  reason: string | null;
  createdAt: string;
  student?: { user: { firstName: string; lastName: string; usn: string | null } };
}

// ── Attendance API ──

export const attendanceApi = {
  // Student
  my: (params?: { from?: string; to?: string }) =>
    apiClient.get<ApiResponse<{ records: AttendanceRecord[]; stats: AttendanceStats }>>('/attendance/my', { params }),

  mark: (data: {
    sessionToken: string;
    sessionId: string;
    deviceFingerprint: string;
    gpsLat: number;
    gpsLng: number;
  }) => apiClient.post<ApiResponse<AttendanceRecord>>('/attendance/mark', data),

  studentHistory: (studentId: string, params?: { from?: string; to?: string }) =>
    apiClient.get<ApiResponse<{ records: AttendanceRecord[]; stats: AttendanceStats }>>(
      `/attendance/student/${studentId}`,
      { params },
    ),

  activeSessions: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<AttendanceSession[]>>('/attendance/sessions/active', { params }),

  // Warden / Admin
  createSession: (data: {
    hostelId?: string;
    title?: string;
    name?: string;
    gpsLat?: number;
    gpsLng?: number;
    durationMin?: number;
    expiryMinutes?: number;
    gpsRadiusM?: number;
  }) => apiClient.post<ApiResponse<AttendanceSession>>('/attendance/session', data),

  getQR: (sessionId: string) =>
    apiClient.get<ApiResponse<QRToken>>(`/attendance/session/${sessionId}/qr`),

  getLive: (sessionId: string) =>
    apiClient.get<ApiResponse<SessionLiveData>>(`/attendance/session/${sessionId}/live`),

  cancelSession: (sessionId: string) =>
    apiClient.post<ApiResponse<void>>(`/attendance/session/${sessionId}/cancel`),

  daily: (params?: { page?: number; limit?: number; date?: string; hostelId?: string; status?: AttendanceStatusName; search?: string }) =>
    apiClient.get<ApiResponse<AttendanceRecord[]> & { meta: PaginationMeta }>('/attendance/daily', { params }),

  presence: (hostelId?: string) =>
    apiClient.get<ApiResponse<PresenceBoard>>('/attendance/presence', { params: hostelId ? { hostelId } : {} }),

  summary: (hostelId: string, date?: string) =>
    apiClient.get<ApiResponse<Record<string, unknown>>>(`/attendance/summary/${hostelId}`, { params: date ? { date } : {} }),

  // Device management
  registerDevice: (data: { fingerprint: string; deviceName?: string; platform?: string }) =>
    apiClient.post<ApiResponse<StudentDevice>>('/attendance/device/register', data),

  myDevice: () =>
    apiClient.get<ApiResponse<StudentDevice>>('/attendance/device/my'),

  requestDeviceChange: (data: { newFingerprint: string; newDeviceName?: string; newPlatform?: string; reason?: string }) =>
    apiClient.post<ApiResponse<DeviceChangeRequest>>('/attendance/device/request-change', data),

  pendingDeviceRequests: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<ApiResponse<DeviceChangeRequest[]> & { meta: PaginationMeta }>('/attendance/device/pending', { params }),

  approveDevice: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/attendance/device/${id}/approve`),

  rejectDevice: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/attendance/device/${id}/reject`),
};
