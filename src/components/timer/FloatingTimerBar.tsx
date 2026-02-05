import { useTaskTimer } from '@/hooks/useTaskTimer';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Check, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function FloatingTimerBar() {
  const {
    timerState,
    elapsedSeconds,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeAndStop,
    formatElapsed,
  } = useTaskTimer();
  const isMobile = useIsMobile();

  // Don't render if no active timer
  if (!timerState.activeTaskId || !timerState.isRunning) {
    return null;
  }

  const handleStop = async () => {
    await stopTimer();
  };

  const handleComplete = async () => {
    await completeAndStop();
  };

  return (
    <div 
      className={cn(
        "fixed left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-lg",
        "safe-area-inset-bottom",
        isMobile ? "bottom-16" : "bottom-0" // Above mobile nav
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Timer display */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Timer className="h-5 w-5 text-primary" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
              </div>
            <span 
                className={cn(
                  "font-mono text-xl font-bold tabular-nums",
                  elapsedSeconds > 3600 ? "text-warning" : "text-primary"
                )}
              >
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
            
            <span className="text-sm text-muted-foreground truncate">
              {timerState.activeTaskText}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Pause/Resume */}
            {timerState.isPaused ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={resumeTimer}
                className="gap-1.5"
              >
                <Play className="h-4 w-4" />
                {!isMobile && <span>Resume</span>}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={pauseTimer}
                className="gap-1.5"
              >
                <Pause className="h-4 w-4" />
                {!isMobile && <span>Pause</span>}
              </Button>
            )}

            {/* Stop (log time only) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStop}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Square className="h-4 w-4" />
              {!isMobile && <span>Stop</span>}
            </Button>

            {/* Complete & Stop */}
            <Button
              variant="default"
              size="sm"
              onClick={handleComplete}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              {!isMobile && <span>Done</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
