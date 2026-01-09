/**
 * Reschedule Loop Banner Component
 * Shows a gentle nudge when a task has been rescheduled multiple times
 */

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task } from '@/components/tasks/types';
import { useRescheduleTracking } from '@/hooks/useRescheduleTracking';
import { MicroCoachModal } from './MicroCoachModal';

interface RescheduleLoopBannerProps {
  task: Task & {
    reschedule_loop_active?: boolean;
    reschedule_nudge_dismissed_until?: string | null;
    reschedule_count_30d?: number;
  };
  variant?: 'card' | 'drawer' | 'list';
  className?: string;
}

export function RescheduleLoopBanner({ task, variant = 'card', className }: RescheduleLoopBannerProps) {
  const { dismissNudge, shouldShowBanner } = useRescheduleTracking();
  const [showMicroCoach, setShowMicroCoach] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  if (!shouldShowBanner(task) || isDismissing) {
    return null;
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissing(true);
    await dismissNudge(task.task_id);
  };

  const handleOpenMicroCoach = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMicroCoach(true);
  };

  const rescheduleCount = task.reschedule_count_30d || 0;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 rounded-md bg-muted/50 border border-muted-foreground/20',
          variant === 'card' && 'px-2 py-1.5 text-xs',
          variant === 'drawer' && 'px-3 py-2 text-sm',
          variant === 'list' && 'px-2 py-1 text-xs',
          className
        )}
        onClick={handleOpenMicroCoach}
      >
        <Sparkles className={cn(
          'shrink-0 text-amber-500',
          variant === 'list' ? 'h-3 w-3' : 'h-4 w-4'
        )} />
        <span className="flex-1 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          You've moved this {rescheduleCount} times. Want to coach it?
        </span>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 hover:bg-muted',
            variant === 'list' ? 'h-5 w-5' : 'h-6 w-6'
          )}
          onClick={handleDismiss}
        >
          <X className={variant === 'list' ? 'h-3 w-3' : 'h-4 w-4'} />
        </Button>
      </div>

      <MicroCoachModal
        open={showMicroCoach}
        onOpenChange={setShowMicroCoach}
        task={task}
      />
    </>
  );
}