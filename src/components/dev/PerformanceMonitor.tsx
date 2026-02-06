import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown, Activity, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QueryMetric {
  queryKey: string;
  time: number;
  timestamp: number;
  dataSize: number;
}

/**
 * Performance monitoring component for development.
 * Shows query performance metrics and highlights slow queries.
 * Only visible in development mode.
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<QueryMetric[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Listen for custom performance events
    const handleMetric = (event: CustomEvent<QueryMetric>) => {
      setMetrics(prev => [...prev.slice(-10), event.detail]); // Keep last 10
    };

    window.addEventListener('query-metric' as keyof WindowEventMap, handleMetric as EventListener);
    return () => window.removeEventListener('query-metric' as keyof WindowEventMap, handleMetric as EventListener);
  }, []);

  const avgQueryTime = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.time, 0) / metrics.length)
    : 0;

  const slowQueries = metrics.filter(m => m.time > 1000);
  const hasSlowQueries = slowQueries.length > 0;

  // Only show in development
  if (import.meta.env.PROD || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        onClick={() => setShowDetails(!showDetails)}
        variant="outline"
        size="sm"
        className={cn(
          "shadow-lg gap-2",
          hasSlowQueries ? "border-destructive text-destructive" : "border-primary"
        )}
      >
        <Activity className="h-4 w-4" />
        {showDetails ? 'Hide' : 'Perf'}
        {hasSlowQueries && (
          <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-xs">
            {slowQueries.length}
          </span>
        )}
      </Button>
      
      {showDetails && (
        <Card className="mt-2 w-80 shadow-xl animate-in slide-in-from-bottom-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                Performance Monitor
                {hasSlowQueries ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-success" />
                )}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded-md p-2">
                <div className="text-xs text-muted-foreground">Avg Time</div>
                <div className={cn(
                  "font-semibold",
                  avgQueryTime > 1000 ? "text-destructive" : avgQueryTime > 500 ? "text-warning" : "text-success"
                )}>
                  {avgQueryTime}ms
                </div>
              </div>
              <div className="bg-muted rounded-md p-2">
                <div className="text-xs text-muted-foreground">Tracked</div>
                <div className="font-semibold">{metrics.length}</div>
              </div>
              <div className="bg-muted rounded-md p-2">
                <div className="text-xs text-muted-foreground">Slow</div>
                <div className={cn(
                  "font-semibold",
                  slowQueries.length > 0 ? "text-destructive" : ""
                )}>
                  {slowQueries.length}
                </div>
              </div>
            </div>

            {hasSlowQueries && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Slow queries detected. Check console for details.
                </AlertDescription>
              </Alert>
            )}

            {/* Recent queries */}
            {metrics.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Recent Queries:</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {metrics.slice().reverse().map((metric, i) => (
                    <div
                      key={`${metric.timestamp}-${i}`}
                      className={cn(
                        "flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/50",
                        metric.time > 1000 && "bg-destructive/10 text-destructive"
                      )}
                    >
                      <span className="truncate flex-1">{metric.queryKey}</span>
                      <span className="font-mono ml-2">{metric.time}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {metrics.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No queries tracked yet
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Emit a performance metric event.
 * Can be called from anywhere to track query performance.
 */
export function emitQueryMetric(metric: QueryMetric) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('query-metric', { detail: metric }));
  }
}
