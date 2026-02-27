const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, noAuth = false } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (!noAuth) {
      const token = this.getToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    let res = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Auto-refresh on 401
    if (res.status === 401 && !noAuth) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = this.getToken();
        if (newToken) {
          requestHeaders['Authorization'] = `Bearer ${newToken}`;
        }
        res = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
      } else {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    const data = await res.json();

    if (!res.ok) {
      throw new ApiError(data.message || 'Request failed', res.status, data);
    }

    return data;
  }

  // Convenience methods
  get<T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = unknown>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  patch<T = unknown>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async upload<T = unknown>(endpoint: string, file: File, fieldName = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new ApiError(data.message || 'Upload failed', res.status, data);
    }

    return data;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient(API_BASE);
