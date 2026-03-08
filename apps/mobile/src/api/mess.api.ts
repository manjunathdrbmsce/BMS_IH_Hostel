import apiClient, { type ApiResponse, type PaginationMeta } from './client';

// ── Types ──

export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type MenuStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type RebateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CREDITED';

export interface MessMenuItem {
  id: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  dishes: string[];
  note: string | null;
}

export interface MessMenu {
  id: string;
  hostelId: string;
  name: string;
  messType: string;
  status: MenuStatus;
  validFrom: string;
  validTo: string | null;
  items: MessMenuItem[];
  hostel?: { name: string };
  createdAt: string;
}

export interface MealScan {
  id: string;
  studentId: string;
  hostelId: string;
  mealType: MealType;
  date: string;
  scannedAt: string;
  isGuest: boolean;
  guestName: string | null;
  guestCount: number;
  status: string;
  student?: { firstName: string; lastName: string; usn: string | null };
  hostel?: { name: string };
}

export interface MealFeedback {
  id: string;
  mealType: MealType;
  rating: number;
  comment: string | null;
  date: string;
  createdAt: string;
}

export interface MessRebate {
  id: string;
  studentId: string;
  hostelId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  totalMeals: number;
  amount: number | null;
  status: RebateStatus;
  leaveRequestId: string | null;
  hostel?: { name: string };
  reviewedBy?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface LiveCounts {
  currentMeal: MealType | null;
  counts: Array<{ mealType: MealType; students: number; guests: number }>;
}

export interface StudentMealStats {
  totalMeals: number;
  breakdown: Record<MealType, number>;
  month: number;
  year: number;
}

export interface TodayMenu {
  dayOfWeek: DayOfWeek;
  items: MessMenuItem[];
  menu?: MessMenu;
}

// ── Mess API ──

export const messApi = {
  // Today's menu
  getToday: (hostelId?: string) =>
    apiClient.get<ApiResponse<TodayMenu>>('/mess/today', { params: hostelId ? { hostelId } : undefined }),

  // Week menu
  getWeek: (hostelId?: string) =>
    apiClient.get<ApiResponse<MessMenuItem[]>>('/mess/week', { params: hostelId ? { hostelId } : undefined }),

  // Student meal history
  getMyHistory: (params?: { page?: number; limit?: number; mealType?: MealType }) =>
    apiClient.get<ApiResponse<MealScan[]> & { meta: PaginationMeta }>('/mess/my/history', { params }),

  // Student meal stats
  getMyStats: (params?: { month?: number; year?: number }) =>
    apiClient.get<ApiResponse<StudentMealStats>>('/mess/my/stats', { params }),

  // Submit feedback
  submitFeedback: (data: { mealType: MealType; rating: number; comment?: string; date?: string }) =>
    apiClient.post<ApiResponse<MealFeedback>>('/mess/feedback', data),

  // Rebates
  getMyRebates: (params?: { page?: number; limit?: number; status?: RebateStatus }) =>
    apiClient.get<ApiResponse<MessRebate[]> & { meta: PaginationMeta }>('/mess/rebates', { params }),

  createRebate: (data: { fromDate: string; toDate: string; reason: string; leaveRequestId?: string }) =>
    apiClient.post<ApiResponse<MessRebate>>('/mess/rebates', data),

  // Live counts (warden)
  getLiveCounts: () =>
    apiClient.get<ApiResponse<LiveCounts>>('/mess/scans/live'),

  // Stats (warden)
  getStats: (params?: { hostelId?: string }) =>
    apiClient.get<ApiResponse<any>>('/mess/stats', { params }),
};
