/**
 * Offline indicator component - shows in the UI when offline or syncing
 */

import { useState, useEffect } from 'react';
import { WifiOff, Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showSyncButton?: boolean;
  compact?: boolean;
}

export function OfflineIndicator({ 
  className, 
  showSyncButton = true,
  compact = false,
}: OfflineIndicatorProps) {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    failedCount,
    triggerSync,
    lastSyncResult,
  } = useOfflineSync();

  const [showSuccess, setShowSuccess] = useState(false);

  // Show success indicator briefly after sync
  useEffect(() => {
    if (lastSyncResult && lastSyncResult.synced > 0 && lastSyncResult.failed === 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncResult]);

  // Don't show anything if online with no pending items and no recent sync
  if (isOnline && pendingCount === 0 && failedCount === 0 && !isSyncing && !showSuccess) {
    return null;
  }

  const handleSync = async () => {
    await triggerSync();
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center', className)}>
              {!isOnline ? (
                <Badge variant="destructive" className="gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              ) : isSyncing ? (
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Syncing
                </Badge>
              ) : showSuccess ? (
                <Badge variant="default" className="gap-1 bg-success">
                  <Check className="h-3 w-3" />
                  Synced
                </Badge>
              ) : pendingCount > 0 ? (
                <Badge variant="outline" className="gap-1">
                  <Cloud className="h-3 w-3" />
                  {pendingCount}
                </Badge>
              ) : failedCount > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {failedCount}
                </Badge>
              ) : null}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {!isOnline ? (
              <p>You're offline. Changes are saved locally.</p>
            ) : isSyncing ? (
              <p>Syncing your changes...</p>
            ) : pendingCount > 0 ? (
              <p>{pendingCount} changes waiting to sync</p>
            ) : failedCount > 0 ? (
              <p>{failedCount} changes failed to sync</p>
            ) : (
              <p>All changes synced</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border',
      !isOnline ? 'bg-destructive/10 border-destructive/30' : 
      isSyncing ? 'bg-primary/10 border-primary/30' :
      showSuccess ? 'bg-success/10 border-success/30' :
      failedCount > 0 ? 'bg-destructive/10 border-destructive/30' :
      'bg-muted border-border',
      className
    )}>
      {/* Status Icon */}
      {!isOnline ? (
        <WifiOff className="h-4 w-4 text-destructive" />
      ) : isSyncing ? (
        <RefreshCw className="h-4 w-4 text-primary animate-spin" />
      ) : showSuccess ? (
        <Check className="h-4 w-4 text-success" />
      ) : pendingCount > 0 ? (
        <Cloud className="h-4 w-4 text-muted-foreground" />
      ) : failedCount > 0 ? (
        <CloudOff className="h-4 w-4 text-destructive" />
      ) : (
        <Cloud className="h-4 w-4 text-success" />
      )}

      {/* Status Text */}
      <span className="text-sm font-medium">
        {!isOnline ? (
          'Offline'
        ) : isSyncing ? (
          'Syncing...'
        ) : showSuccess ? (
          'Synced!'
        ) : pendingCount > 0 ? (
          `${pendingCount} pending`
        ) : failedCount > 0 ? (
          `${failedCount} failed`
        ) : (
          'Online'
        )}
      </span>

      {/* Sync Button */}
      {showSyncButton && isOnline && (pendingCount > 0 || failedCount > 0) && !isSyncing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Sync
        </Button>
      )}
    </div>
  );
}

/**
 * Floating offline banner - shows at the top of the screen when offline
 */
export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineSync();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>
        You're offline. 
        {pendingCount > 0 && ` ${pendingCount} changes saved locally.`}
        {' '}Your work will sync when you reconnect.
      </span>
    </div>
  );
}
