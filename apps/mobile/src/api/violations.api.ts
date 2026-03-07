import apiClient, { type ApiResponse, type PaginationMeta } from './client';
import type { ViolationTypeName } from '@/constants';

// ── Types ──

export interface Violation {
  id: string;
  studentId: string;
  type: ViolationTypeName;
  date: string;
  description: string | null;
  escalationState: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  notes: string | null;
  student?: { user: { firstName: string; lastName: string; usn: string | null } };
  createdAt: string;
}

export interface ViolationListParams {
  page?: number;
  limit?: number;
  studentId?: string;
  type?: ViolationTypeName;
  escalationState?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

// ── Violations API ──

export const violationsApi = {
  list: (params?: ViolationListParams) =>
    apiClient.get<ApiResponse<Violation[]> & { meta: PaginationMeta }>('/violations', { params }),

  my: (params?: ViolationListParams) =>
    apiClient.get<ApiResponse<Violation[]> & { meta: PaginationMeta }>('/violations/my', { params }),

  studentViolations: (studentId: string, params?: ViolationListParams) =>
    apiClient.get<ApiResponse<Violation[]> & { meta: PaginationMeta }>(`/violations/student/${studentId}`, { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Violation>>(`/violations/${id}`),

  resolve: (id: string, notes?: string) =>
    apiClient.patch<ApiResponse<Violation>>(`/violations/${id}/resolve`, notes ? { notes } : {}),

  stats: () =>
    apiClient.get<ApiResponse<Record<string, number>>>('/violations/stats'),
};
