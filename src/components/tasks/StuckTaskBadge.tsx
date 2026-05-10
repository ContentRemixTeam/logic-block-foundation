import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Props {
  rescheduleCount?: number | null;
  /** Show only when count meets/exceeds this. Default 3. */
  threshold?: number;
  className?: string;
}

/**
 * Quiet badge that flags a task as "stuck" when it has been rescheduled
 * `threshold` or more times. Hidden otherwise so it never shames the user.
 */
export function StuckTaskBadge({ rescheduleCount, threshold = 3, className }: Props) {
  if (!rescheduleCount || rescheduleCount < threshold) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`gap-1 text-[10px] border-warning/40 text-warning bg-warning/10 ${className ?? ''}`}
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          Stuck · {rescheduleCount}×
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        Moved {rescheduleCount} times. Maybe it's too big, unclear, or not actually important.
        Try shrinking it or asking what's really in the way.
      </TooltipContent>
    </Tooltip>
  );
}
