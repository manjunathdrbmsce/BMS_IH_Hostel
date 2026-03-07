import apiClient, { type ApiResponse, type PaginationMeta } from './client';
import type { NoticePriorityName } from '@/constants';

// ── Types ──

export interface Notice {
  id: string;
  title: string;
  body: string;
  /** Alias for body */
  content: string;
  priority: NoticePriorityName;
  scope: string;
  isActive: boolean;
  expiresAt: string | null;
  targetBuildingId: string | null;
  targetHostelId: string | null;
  createdBy: string;
  creator?: { firstName: string; lastName: string };
  /** Alias for creator */
  author?: { firstName: string; lastName: string };
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeListParams {
  page?: number;
  limit?: number;
  scope?: string;
  priority?: NoticePriorityName;
  activeOnly?: boolean;
  search?: string;
}

// ── Notices API ──

export const noticesApi = {
  list: (params?: NoticeListParams) =>
    apiClient.get<ApiResponse<Notice[]> & { meta: PaginationMeta }>('/notices', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Notice>>(`/notices/${id}`),

  create: (data: {
    title: string;
    body: string;
    priority?: NoticePriorityName;
    scope?: string;
    targetBuildingId?: string;
    targetHostelId?: string;
    expiresAt?: string;
  }) => apiClient.post<ApiResponse<Notice>>('/notices', data),

  update: (id: string, data: Partial<{ title: string; body: string; priority: NoticePriorityName; isActive: boolean; expiresAt: string }>) =>
    apiClient.patch<ApiResponse<Notice>>(`/notices/${id}`, data),

  markRead: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/notices/${id}/read`),

  stats: () =>
    apiClient.get<ApiResponse<Record<string, number>>>('/notices/stats'),
};
