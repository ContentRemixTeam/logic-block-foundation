import { Loader2, CheckCircle, AlertCircle, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface SaveStatusBannerProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  isSyncing?: boolean;
}

export function SaveStatusBanner({ status, lastSaved, isSyncing }: SaveStatusBannerProps) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {status === 'saving' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Saving your progress...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">All changes saved</span>
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                ({format(lastSaved, 'h:mm a')})
              </span>
            )}
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Save failed - retrying...</span>
          </>
        )}
        {status === 'idle' && (
          <>
            <Cloud className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Auto-saving enabled</span>
          </>
        )}
      </div>
      
      <Badge variant="outline" className="gap-1 text-xs">
        <Cloud className="h-3 w-3" />
        Backed up to cloud
      </Badge>
    </div>
  );
}
