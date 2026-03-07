import apiClient, { type ApiResponse, type PaginationMeta } from './client';
import type { LeaveTypeName, LeaveStatusName } from '@/constants';

// ── Types ──

export interface LeaveRequest {
  id: string;
  studentId: string;
  hostelId: string;
  type: LeaveTypeName;
  status: LeaveStatusName;
  fromDate: string;
  toDate: string;
  reason: string;
  proofUrl?: string | null;
  parentApprovedAt?: string | null;
  wardenApprovedAt?: string | null;
  rejectionReason?: string | null;
  student?: { user: { firstName: string; lastName: string; usn: string | null } };
  createdAt: string;
  updatedAt: string;
}

export interface LeaveEligibility {
  eligible: boolean;
  hostel: { id: string; name: string } | null;
  guardian: { id: string; user: { firstName: string; lastName: string } } | null;
  room: { roomNumber: string } | null;
}

export interface LeaveListParams {
  page?: number;
  limit?: number;
  studentId?: string;
  hostelId?: string;
  status?: LeaveStatusName;
  type?: LeaveTypeName;
  search?: string;
}

// ── Leave API ──

export const leaveApi = {
  list: (params?: LeaveListParams) =>
    apiClient.get<ApiResponse<LeaveRequest[]> & { meta: PaginationMeta }>('/leave', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<LeaveRequest>>(`/leave/${id}`),

  eligibility: () =>
    apiClient.get<ApiResponse<LeaveEligibility>>('/leave/eligibility'),

  apply: (data: {
    studentId: string;
    hostelId: string;
    type: LeaveTypeName;
    fromDate: string;
    toDate: string;
    reason: string;
    proofUrl?: string;
  }) => apiClient.post<ApiResponse<LeaveRequest>>('/leave', data),

  cancel: (id: string) =>
    apiClient.post<ApiResponse<LeaveRequest>>(`/leave/${id}/cancel`),

  parentApprove: (id: string) =>
    apiClient.post<ApiResponse<LeaveRequest>>(`/leave/${id}/parent-approve`),

  parentReject: (id: string, rejectionReason?: string) =>
    apiClient.post<ApiResponse<LeaveRequest>>(`/leave/${id}/parent-reject`, rejectionReason ? { rejectionReason } : undefined),

  wardenApprove: (id: string) =>
    apiClient.post<ApiResponse<LeaveRequest>>(`/leave/${id}/warden-approve`),

  reject: (id: string, rejectionReason: string) =>
    apiClient.post<ApiResponse<LeaveRequest>>(`/leave/${id}/reject`, { rejectionReason }),

  stats: () =>
    apiClient.get<ApiResponse<Record<string, number>>>('/leave/stats'),
};
