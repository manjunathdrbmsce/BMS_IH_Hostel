import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, type RoleName, getNavigatorGroup } from '@/constants';
import { authApi, type User } from '@/api';

// ── Types ──

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Helpers
  hasRole: (role: RoleName) => boolean;
  getRoles: () => RoleName[];
  getNavigatorGroup: () => string;
  clearError: () => void;
}

// ── Store ──

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) {
        set({ isLoading: false, isInitialized: true });
        return;
      }

      // Validate token by fetching current user
      const { data } = await authApi.me();
      set({
        user: data.data,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch {
      // Token invalid or expired — clear and reset
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {});
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  login: async (identifier: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data } = await authApi.login(identifier, password);
      const { accessToken, refreshToken, user } = data.data;

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Login failed. Please try again.';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await authApi.logout().catch(() => {});
    } finally {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN).catch(() => {});
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  refreshProfile: async () => {
    try {
      const { data } = await authApi.me();
      set({ user: data.data });
    } catch {
      // Silently fail — will use cached user
    }
  },

  hasRole: (role: RoleName) => {
    const { user } = get();
    if (!user) return false;
    return user.roles.some((r) => r.role === role);
  },

  getRoles: () => {
    const { user } = get();
    if (!user) return [];
    return user.roles.map((r) => r.role);
  },

  getNavigatorGroup: () => {
    const { user } = get();
    if (!user) return '(auth)';
    return getNavigatorGroup(user.roles.map((r) => r.role));
  },

  clearError: () => set({ error: null }),
}));
