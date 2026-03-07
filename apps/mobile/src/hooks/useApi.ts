import { useCallback, useEffect, useState } from 'react';
import { type AxiosResponse } from 'axios';
import type { ApiResponse } from '@/api';

// ── useApi: generic hook for API calls with loading/error state ──

interface UseApiOptions<T> {
  /** Call the API immediately on mount */
  immediate?: boolean;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for executing API calls with automatic loading/error state management.
 *
 * @example
 * const { data, isLoading, execute } = useApi(() => leaveApi.list({ status: 'PENDING' }));
 */
export function useApi<T>(
  apiFn: (...args: any[]) => Promise<AxiosResponse<ApiResponse<T>>>,
  options: UseApiOptions<T> = {},
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(options.immediate ?? false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFn(...args);
        const result = response.data.data;
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || 'An unexpected error occurred';
        setError(message);
        options.onError?.(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFn],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, []);

  return { data, isLoading, error, execute, reset };
}

// ── usePaginatedApi: for paginated list endpoints ──

interface PaginatedResult<T> {
  items: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  /** @deprecated use isLoading */
  loading: boolean;
  /** @deprecated use isRefreshing */
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function usePaginatedApi<T>(
  apiFn: (params: any) => Promise<AxiosResponse<any>>,
  baseParams: Record<string, any> = {},
  pageSize = 20,
): PaginatedResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Stable serialisation of baseParams so we can use it in deps
  const paramsKey = JSON.stringify(baseParams);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      try {
        setError(null);
        const merged = { ...JSON.parse(paramsKey), page: pageNum, limit: pageSize };
        const response = await apiFn(merged);
        const newItems: T[] = response.data.data;
        const meta = response.data.meta;

        if (append) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }

        setHasMore(meta ? pageNum < meta.totalPages : newItems.length >= pageSize);
        setPage(pageNum);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load data');
      }
    },
    [apiFn, paramsKey, pageSize],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPage(1, false);
    setIsRefreshing(false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchPage(page + 1, true);
    setIsLoadingMore(false);
  }, [fetchPage, page, hasMore, isLoadingMore]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await fetchPage(1, false);
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchPage]);

  return {
    items, isLoading, isRefreshing, isLoadingMore, error, hasMore, page, refresh, loadMore,
    loading: isLoading,
    refreshing: isRefreshing,
  };
}
