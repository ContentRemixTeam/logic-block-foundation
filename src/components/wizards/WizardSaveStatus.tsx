import { Check, AlertCircle, Loader2, Cloud, CloudOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WizardSaveStatusProps {
  isSaving: boolean;
  lastSaved: Date | null;
  syncError: string | null;
  className?: string;
}

export function WizardSaveStatus({
  isSaving,
  lastSaved,
  syncError,
  className,
}: WizardSaveStatusProps) {
  if (syncError) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-destructive', className)}>
        <CloudOff className="h-3.5 w-3.5" />
        <span>{syncError}</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (lastSaved) {
    const timeAgo = formatDistanceToNow(lastSaved, { addSuffix: false });
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Cloud className="h-3.5 w-3.5 text-green-500" />
        <span>Saved {timeAgo} ago</span>
      </div>
    );
  }

  return null;
}
