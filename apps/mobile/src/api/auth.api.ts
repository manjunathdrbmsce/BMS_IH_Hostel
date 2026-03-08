import apiClient, { type ApiResponse } from './client';
import type { RoleName } from '@/constants';

// ── Types ──

export interface User {
  id: string;
  email: string;
  mobile: string | null;
  firstName: string;
  lastName: string;
  usn: string | null;
  status: string;
  roles: { name: RoleName; displayName?: string }[];
  studentProfile?: StudentProfile | null;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  gender: string | null;
  department: string | null;
  course: string | null;
  year: number | null;
  semester: number | null;
  permanentAddress: string | null;
  emergencyContact: string | null;
  medicalConditions: string | null;
  photoUrl: string | null;
  rollNumber: string | null;
  roomNumber: string | null;
  hostelName: string | null;
  user?: User;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

// ── Auth API ──

export const authApi = {
  login: (identifier: string, password: string) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { identifier, password }),

  signup: (data: { firstName: string; lastName: string; email: string; mobile: string; password: string; usn?: string }) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/signup', data),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),

  logout: () => apiClient.post<ApiResponse<void>>('/auth/logout'),

  me: () => apiClient.get<ApiResponse<User>>('/auth/me'),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<ApiResponse<void>>('/auth/reset-password', { token, newPassword }),
};
