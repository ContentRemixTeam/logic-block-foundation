import { useSlowQueryListener } from '@/hooks/useQueryPerformance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Displays a warning when slow database queries are detected.
 * Helps developers and power users identify performance issues.
 * Only shows in development or for users with debug mode enabled.
 */
export function QueryPerformanceWarning() {
  const { slowQueries, hasSlowQueries } = useSlowQueryListener();
  const [dismissed, setDismissed] = useState(false);

  // Only show in development mode
  const isDev = import.meta.env.DEV;
  
  if (!isDev || !hasSlowQueries || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm animate-in slide-in-from-right-5">
      <Alert variant="destructive" className="relative bg-destructive/95 backdrop-blur-sm">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          Performance Warning
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 hover:bg-destructive-foreground/10"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertTitle>
        <AlertDescription className="text-xs">
          <p className="mb-2">Slow queries detected:</p>
          <ul className="space-y-1">
            {slowQueries.slice(0, 3).map((q, i) => (
              <li key={i} className="truncate font-mono">
                {Math.round(q.fetchTime)}ms - {q.queryKey.slice(0, 30)}...
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
