import apiClient, { type ApiResponse, type PaginationMeta } from './client';

// ── Types ──

export interface DashboardStats {
  totalStudents?: number;
  totalHostels?: number;
  occupancyRate?: number;
  attendancePercentage?: number;
  pendingLeaves?: number;
  openComplaints?: number;
  users: {
    total: number;
    active: number;
    students: number;
    staff: number;
    pending: number;
    suspended: number;
  };
  hostels: {
    total: number;
    active: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    occupancyRate: number;
  };
  leave: {
    pending: number;
    approved: number;
    rejected: number;
  };
  complaints: {
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export interface StudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  year?: number;
}

export interface GuardianLink {
  id: string;
  studentId: string;
  guardianId: string;
  relation: string;
  isPrimary: boolean;
  guardian?: { id: string; user: { firstName: string; lastName: string; email: string; mobile: string | null } };
}

// ── Students API ──

export const studentsApi = {
  list: (params?: StudentListParams) =>
    apiClient.get<ApiResponse<unknown[]> & { meta: PaginationMeta }>('/students/profiles', { params }),

  get: (userId: string) =>
    apiClient.get<ApiResponse<unknown>>(`/students/profiles/${userId}`),

  guardians: (studentId: string) =>
    apiClient.get<ApiResponse<GuardianLink[]>>(`/students/guardians/${studentId}`),
};

// ── Dashboard API ──

export const dashboardApi = {
  stats: () =>
    apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
};
