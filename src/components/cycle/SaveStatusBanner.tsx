import { Loader2, CheckCircle, AlertCircle, Cloud, HardDrive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SaveStatusBannerProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  isSyncing?: boolean;
  lastServerSync?: Date | null;
  syncError?: string | null;
}

export function SaveStatusBanner({
  status,
  lastSaved,
  isSyncing,
  lastServerSync,
  syncError,
}: SaveStatusBannerProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {status === 'saving' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Saving in this browser...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <HardDrive className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">Saved in this browser</span>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">({format(lastSaved, 'h:mm a')})</span>
            )}
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Could not save in this browser</span>
          </>
        )}
        {status === 'idle' && (
          <>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Browser draft enabled</span>
          </>
        )}
      </div>

      {isSyncing ? (
        <Badge variant="outline" className="gap-1 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Cloud backup pending
        </Badge>
      ) : lastServerSync ? (
        <Badge variant="outline" className="gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" /> Cloud backup confirmed {format(lastServerSync, 'h:mm a')}
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
          <Cloud className="h-3 w-3" /> {syncError ? 'Cloud backup not confirmed' : 'Cloud backup pending'}
        </Badge>
      )}
    </div>
  );
}
