import apiClient, { type ApiResponse, type PaginationMeta } from './client';

// ── Types ──

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  state: string;
  readAt: string | null;
  createdAt: string;
}

// ── Notifications API ──

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<ApiResponse<Notification[]> & { meta: PaginationMeta }>('/notifications', { params }),

  unreadCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.patch<ApiResponse<void>>(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.patch<ApiResponse<void>>('/notifications/read-all'),
};
