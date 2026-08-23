import { Loader2, CheckCircle, AlertCircle, Cloud, HardDrive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getCycleSaveStatusPresentation } from '@/lib/cycleSetupPersistence';
import type { CycleCloudIssue, CycleLocalSaveStatus } from '@/lib/cycleSetupPersistence';
import { Button } from '@/components/ui/button';

interface SaveStatusBannerProps {
  localStatus: CycleLocalSaveStatus;
  lastLocalSave: Date | null;
  isCloudSyncing?: boolean;
  lastCloudSync: Date | null;
  cloudIssue: CycleCloudIssue;
  onReloadCloudDraft?: () => void;
}

export function SaveStatusBanner({
  localStatus,
  lastLocalSave,
  isCloudSyncing = false,
  lastCloudSync,
  cloudIssue,
  onReloadCloudDraft,
}: SaveStatusBannerProps) {
  const presentation = getCycleSaveStatusPresentation({
    localStatus,
    lastLocalSave,
    isCloudSyncing,
    lastCloudSync,
    cloudIssue,
  });
  const timestamp = presentation.kind === 'cloud'
    ? lastCloudSync
    : presentation.kind === 'local' || presentation.kind === 'conflict'
      ? lastLocalSave
      : null;
  const StatusIcon = presentation.kind === 'saving' || presentation.kind === 'syncing'
    ? Loader2
      : presentation.kind === 'error' || presentation.kind === 'conflict'
      ? AlertCircle
      : presentation.kind === 'cloud'
        ? CheckCircle
        : HardDrive;

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 ${presentation.kind === 'saving' || presentation.kind === 'syncing' ? 'animate-spin text-primary' : presentation.kind === 'error' ? 'text-destructive' : presentation.kind === 'conflict' ? 'text-amber-500' : presentation.kind === 'cloud' ? 'text-green-500' : 'text-muted-foreground'}`} />
        <span className={`text-sm ${presentation.kind === 'error' ? 'text-destructive' : presentation.kind === 'conflict' ? 'text-amber-700 dark:text-amber-300' : presentation.kind === 'cloud' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
          {presentation.message}
        </span>
        {timestamp && (
          <span className="text-xs text-muted-foreground">({format(timestamp, 'h:mm a')})</span>
        )}
        {presentation.kind === 'conflict' && onReloadCloudDraft ? (
          <Button type="button" variant="outline" size="sm" onClick={onReloadCloudDraft}>
            Reload cloud draft
          </Button>
        ) : null}
      </div>
      
      <Badge variant="outline" className="gap-1 text-xs">
        <Cloud className="h-3 w-3" />
        {presentation.cloudLabel}
      </Badge>
    </div>
  );
}
