'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from './api';

export interface UserProfile {
  id: string;
  email: string;
  mobile: string | null;
  firstName: string;
  lastName: string;
  roles: Array<{ name: string; displayName: string }>;
  permissions: string[];
  status: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await api.get<{ success: boolean; data: UserProfile }>('/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<{
      success: boolean;
      data: {
        accessToken: string;
        refreshToken: string;
        user: UserProfile;
      };
    }>('/auth/login', { identifier, password }, { noAuth: true });

    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return user.roles.some((r) => roles.includes(r.name));
    },
    [user],
  );

  const hasPermission = useCallback(
    (...permissions: string[]) => {
      if (!user) return false;
      if (user.roles.some((r) => r.name === 'SUPER_ADMIN')) return true;
      return permissions.every((p) => user.permissions?.includes(p));
    },
    [user],
  );

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, hasRole, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
