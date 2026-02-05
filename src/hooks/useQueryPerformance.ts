import { useEffect, useRef, useState } from 'react';
import { UseQueryResult } from '@tanstack/react-query';

interface QueryPerformanceOptions {
  queryKey: readonly unknown[];
  warnThresholdMs?: number;
  errorThresholdMs?: number;
  enabled?: boolean;
}

interface SlowQueryEvent {
  queryKey: string;
  fetchTime: number;
  timestamp: number;
  dataSize: number;
}

/**
 * Hook to monitor query performance and emit warnings for slow queries.
 * Helps identify performance issues before they impact users.
 */
export function useQueryPerformance<TData = unknown>(
  query: UseQueryResult<TData>,
  options: QueryPerformanceOptions
) {
  const { 
    queryKey, 
    warnThresholdMs = 1000, 
    errorThresholdMs = 3000,
    enabled = true 
  } = options;

  const lastDataUpdatedAt = useRef<number | null>(null);
  const fetchStartTime = useRef<number | null>(null);

  // Track when fetching starts
  useEffect(() => {
    if (query.isFetching && !fetchStartTime.current) {
      fetchStartTime.current = Date.now();
    }
  }, [query.isFetching]);

  // Measure fetch time when data arrives
  useEffect(() => {
    if (!enabled) return;
    
    const currentDataUpdatedAt = query.dataUpdatedAt;
    
    // Only process if we have new data and were tracking a fetch
    if (
      currentDataUpdatedAt && 
      currentDataUpdatedAt !== lastDataUpdatedAt.current &&
      !query.isFetching &&
      fetchStartTime.current
    ) {
      const fetchTime = Date.now() - fetchStartTime.current;
      const queryKeyStr = JSON.stringify(queryKey);
      const dataSize = query.data ? JSON.stringify(query.data).length : 0;
      
      if (fetchTime > errorThresholdMs) {
        console.error(
          `🔴 CRITICAL: Slow query detected: ${queryKeyStr}`,
          {
            fetchTime: `${fetchTime}ms`,
            threshold: `${errorThresholdMs}ms`,
            dataSize: `${Math.round(dataSize / 1024)}KB`,
          }
        );
        
        // Emit event for UI warning
        emitSlowQueryEvent({
          queryKey: queryKeyStr,
          fetchTime,
          timestamp: Date.now(),
          dataSize,
        });
      } else if (fetchTime > warnThresholdMs) {
        console.warn(
          `⚠️ Slow query detected: ${queryKeyStr}`,
          {
            fetchTime: `${fetchTime}ms`,
            threshold: `${warnThresholdMs}ms`,
            dataSize: `${Math.round(dataSize / 1024)}KB`,
          }
        );
        
        emitSlowQueryEvent({
          queryKey: queryKeyStr,
          fetchTime,
          timestamp: Date.now(),
          dataSize,
        });
      }
      
      // Reset tracking
      lastDataUpdatedAt.current = currentDataUpdatedAt;
      fetchStartTime.current = null;
    }
  }, [query.dataUpdatedAt, query.isFetching, query.data, queryKey, warnThresholdMs, errorThresholdMs, enabled]);
}

/**
 * Emit a custom event when a slow query is detected.
 * Can be listened to by UI components to show warnings.
 */
function emitSlowQueryEvent(detail: SlowQueryEvent) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('slow-query', { detail }));
  }
}

/**
 * Hook to track if any queries are running slowly.
 * Returns the most recent slow queries for display.
 */
export function useSlowQueryListener() {
  const [slowQueries, setSlowQueries] = useState<SlowQueryEvent[]>([]);

  useEffect(() => {
    const handleSlowQuery = (event: CustomEvent<SlowQueryEvent>) => {
      setSlowQueries(prev => {
        const updated = [...prev, event.detail].slice(-5); // Keep last 5
        return updated;
      });
    };

    window.addEventListener('slow-query' as unknown as keyof WindowEventMap, handleSlowQuery as EventListener);
    return () => window.removeEventListener('slow-query' as unknown as keyof WindowEventMap, handleSlowQuery as EventListener);
  }, []);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const tenSecondsAgo = Date.now() - 10000;
      setSlowQueries(prev => 
        prev.filter(q => q.timestamp > tenSecondsAgo)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return { slowQueries, hasSlowQueries: slowQueries.length > 0 };
}
