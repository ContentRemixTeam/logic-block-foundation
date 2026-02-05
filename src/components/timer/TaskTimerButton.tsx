import { useTaskTimer, TaskForTimer } from '@/hooks/useTaskTimer';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaskTimerButtonProps {
  task: TaskForTimer;
  compact?: boolean;
  className?: string;
}

export function TaskTimerButton({ task, compact = false, className }: TaskTimerButtonProps) {
  const {
    timerState,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatElapsed,
  } = useTaskTimer();

  const isThisTaskActive = timerState.activeTaskId === task.task_id;
  const isOtherTaskActive = timerState.activeTaskId && !isThisTaskActive;

  const handleStartOrSwitch = () => {
    if (isOtherTaskActive) {
      // Stop current timer before switching (this will save the time)
      stopTimer().then(() => {
        startTimer(task);
      });
    } else {
      startTimer(task);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await stopTimer();
  };

  // This task is being timed
  if (isThisTaskActive && timerState.isRunning) {
    return (
      <div 
        className={cn("flex items-center gap-1", className)} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Elapsed time display */}
        <span 
          className={cn(
            "font-mono text-sm font-medium tabular-nums text-primary",
            compact && "text-xs"
          )}
        >
          {formatElapsed(elapsedSeconds)}
        </span>

        {/* Pause/Resume button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  timerState.isPaused ? resumeTimer() : pauseTimer();
                }}
              >
                {timerState.isPaused ? (
                  <Play className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Pause className="h-3.5 w-3.5 text-primary" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {timerState.isPaused ? 'Resume timer' : 'Pause timer'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Stop button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleStop}
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Stop & log time
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Start/Switch button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
              isOtherTaskActive && "opacity-50 group-hover:opacity-100",
              className
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleStartOrSwitch();
            }}
          >
            <Timer className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isOtherTaskActive ? 'Switch timer to this task' : 'Start timer'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
