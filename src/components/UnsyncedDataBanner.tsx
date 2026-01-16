/**
 * Banner component that shows when there's unsynced data
 * Displayed at the top of the layout
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { UnsyncedDataRecovery } from './UnsyncedDataRecovery';
import { cn } from '@/lib/utils';

interface UnsyncedDataBannerProps {
  className?: string;
}

export function UnsyncedDataBanner({ className }: UnsyncedDataBannerProps) {
  const { pendingCount, failedCount, isSyncing, isOnline, triggerSync } = useOfflineSync();
  const [showRecovery, setShowRecovery] = useState(false);

  const totalUnsynced = pendingCount + failedCount;

  // Don't show if nothing to sync
  if (totalUnsynced === 0) return null;

  return (
    <>
      <div className={cn(
        "px-4 py-2 flex items-center justify-between gap-3 text-sm",
        !isOnline 
          ? "bg-amber-500/10 border-b border-amber-500/20" 
          : failedCount > 0 
            ? "bg-destructive/10 border-b border-destructive/20"
            : "bg-primary/5 border-b border-primary/10",
        className
      )}>
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : failedCount > 0 ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Cloud className="h-4 w-4 text-primary" />
          )}
          
          <span className={cn(
            "font-medium",
            !isOnline 
              ? "text-amber-700 dark:text-amber-300"
              : failedCount > 0 
                ? "text-destructive"
                : "text-foreground"
          )}>
            {!isOnline 
              ? `${totalUnsynced} change${totalUnsynced > 1 ? 's' : ''} saved locally (offline)`
              : failedCount > 0
                ? `${failedCount} change${failedCount > 1 ? 's' : ''} failed to sync`
                : `${pendingCount} change${pendingCount > 1 ? 's' : ''} waiting to sync`
            }
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setShowRecovery(true)}
            className="h-7 text-xs"
          >
            View
          </Button>
          
          {isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerSync()}
              disabled={isSyncing}
              className="h-7 text-xs"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Now'
              )}
            </Button>
          )}
        </div>
      </div>

      <UnsyncedDataRecovery
        open={showRecovery}
        onOpenChange={setShowRecovery}
        onSyncNow={async () => { await triggerSync(); }}
      />
    </>
  );
}
