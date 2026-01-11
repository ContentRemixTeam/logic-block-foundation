import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface PaginationState {
  offset: number;
  limit: number;
  totalCount: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  queryFn: (params: { limit: number; offset: number }) => Promise<PaginatedResult<T>>;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  /** Preserve scroll position when loading more */
  preserveScrollPosition?: boolean;
}

export interface UsePaginatedQueryResult<T> {
  /** All loaded items (accumulated across pages) */
  items: T[];
  /** Total count from server */
  totalCount: number;
  /** Number of items currently shown */
  shownCount: number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether "load more" is in progress */
  isLoadingMore: boolean;
  /** Load the next page of items */
  loadMore: () => void;
  /** Reset to first page */
  reset: () => void;
  /** Refresh all loaded data */
  refresh: () => void;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Error if any */
  error: Error | null;
}

// Store pagination state per query key to preserve across navigation
const paginationCache = new Map<string, { items: any[]; offset: number; totalCount: number }>();

export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  pageSize = 50,
  enabled = true,
  staleTime = 1000 * 60,
}: UsePaginatedQueryOptions<T>): UsePaginatedQueryResult<T> {
  const queryClient = useQueryClient();
  const cacheKey = queryKey.join(':');
  
  // Initialize from cache if available
  const cached = paginationCache.get(cacheKey);
  const [items, setItems] = useState<T[]>(cached?.items || []);
  const [offset, setOffset] = useState(cached?.offset || 0);
  const [totalCount, setTotalCount] = useState(cached?.totalCount || 0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isInitialLoad = useRef(true);

  // Initial query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, 'paginated', 0],
    queryFn: async () => {
      const result = await queryFn({ limit: pageSize, offset: 0 });
      return result;
    },
    enabled: enabled && isInitialLoad.current,
    staleTime,
  });

  // Handle initial data
  useEffect(() => {
    if (data && isInitialLoad.current) {
      setItems(data.data);
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      setOffset(data.data.length);
      isInitialLoad.current = false;
      
      // Cache the state
      paginationCache.set(cacheKey, {
        items: data.data,
        offset: data.data.length,
        totalCount: data.totalCount,
      });
    }
  }, [data, cacheKey]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const result = await queryFn({ limit: pageSize, offset });
      
      const newItems = [...items, ...result.data];
      const newOffset = newItems.length;
      
      setItems(newItems);
      setOffset(newOffset);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      
      // Update cache
      paginationCache.set(cacheKey, {
        items: newItems,
        offset: newOffset,
        totalCount: result.totalCount,
      });
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, items, hasMore, isLoadingMore, queryFn, pageSize, cacheKey]);

  // Reset pagination
  const reset = useCallback(() => {
    setItems([]);
    setOffset(0);
    setTotalCount(0);
    setHasMore(true);
    isInitialLoad.current = true;
    paginationCache.delete(cacheKey);
    queryClient.invalidateQueries({ queryKey: [...queryKey, 'paginated'] });
  }, [queryKey, queryClient, cacheKey]);

  // Refresh all loaded data
  const refresh = useCallback(async () => {
    const currentOffset = offset;
    setIsLoadingMore(true);
    
    try {
      // Fetch all currently loaded items at once
      const result = await queryFn({ limit: currentOffset || pageSize, offset: 0 });
      
      setItems(result.data);
      setOffset(result.data.length);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      
      // Update cache
      paginationCache.set(cacheKey, {
        items: result.data,
        offset: result.data.length,
        totalCount: result.totalCount,
      });
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, queryFn, pageSize, cacheKey]);

  const currentPage = Math.ceil(items.length / pageSize) || 1;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return {
    items,
    totalCount,
    shownCount: items.length,
    hasMore,
    isLoading: isLoading && items.length === 0,
    isLoadingMore,
    loadMore,
    reset,
    refresh,
    currentPage,
    totalPages,
    error: error as Error | null,
  };
}

/**
 * Clear all pagination cache
 */
export function clearPaginationCache() {
  paginationCache.clear();
}

/**
 * Clear specific pagination cache
 */
export function clearPaginationCacheFor(queryKey: string[]) {
  paginationCache.delete(queryKey.join(':'));
}
