import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from '@/constants';

// ── Types ──

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// ── State ──

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((req) => {
    if (error) req.reject(error);
    else req.resolve(token!);
  });
  failedQueue = [];
}

// ── Axios Instance ──

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor ──

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore unavailable — continue without token
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor (token refresh with mutex) ──

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 and if we haven't retried yet
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Skip refresh for auth endpoints themselves
    const url = originalRequest.url ?? '';
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/signup')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      const newAccessToken = data.data.accessToken;
      const newRefreshToken = data.data.refreshToken;

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

      processQueue(null, newAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Clear tokens — user must re-login
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {});
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
