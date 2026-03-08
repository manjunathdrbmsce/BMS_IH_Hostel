import apiClient, { type ApiResponse, type PaginationMeta } from './client';
import type { ComplaintCategoryName, ComplaintStatusName } from '@/constants';

// ── Types ──

export interface Complaint {
  id: string;
  studentId: string;
  hostelId: string;
  category: ComplaintCategoryName;
  subject: string;
  description: string;
  priority: string;
  status: ComplaintStatusName;
  isAnonymous: boolean;
  assignedToId: string | null;
  resolution: string | null;
  student?: { user: { firstName: string; lastName: string; usn: string | null } };
  comments?: ComplaintComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintComment {
  id: string;
  complaintId: string;
  userId: string;
  message: string;
  user?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface ComplaintListParams {
  page?: number;
  limit?: number;
  studentId?: string;
  hostelId?: string;
  status?: ComplaintStatusName;
  category?: ComplaintCategoryName;
  priority?: string;
  search?: string;
}

// ── Complaints API ──

export const complaintsApi = {
  list: (params?: ComplaintListParams) =>
    apiClient.get<ApiResponse<Complaint[]> & { meta: PaginationMeta }>('/complaints', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Complaint>>(`/complaints/${id}`),

  create: (data: {
    studentId?: string;
    hostelId?: string;
    category: ComplaintCategoryName;
    subject: string;
    description: string;
    priority?: string;
    isAnonymous?: boolean;
  }) => apiClient.post<ApiResponse<Complaint>>('/complaints', data),

  update: (id: string, data: { status?: ComplaintStatusName; assignedToId?: string; priority?: string; resolution?: string }) =>
    apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}`, data),

  addComment: (id: string, message: string) =>
    apiClient.post<ApiResponse<ComplaintComment>>(`/complaints/${id}/comments`, { message }),

  stats: () =>
    apiClient.get<ApiResponse<Record<string, number>>>('/complaints/stats'),
};
