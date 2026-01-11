import { Timer } from 'lucide-react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useArcade } from '@/hooks/useArcade';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PomodoroMiniWidgetProps {
  onClick: () => void;
}

export function PomodoroMiniWidget({ onClick }: PomodoroMiniWidgetProps) {
  const { mode, formattedTime, isRunning } = usePomodoro();
  
  // Show idle state indicator when no timer is running
  if (mode === 'idle') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="flex items-center gap-1.5 px-2 h-8 text-muted-foreground hover:text-foreground"
          >
            <Timer className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Start a focus session</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  const modeLabel = mode === 'focus' ? 'Focus' : 'Break';
  const modeColor = mode === 'focus' 
    ? 'text-red-600 dark:text-red-400' 
    : 'text-green-600 dark:text-green-400';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={`flex items-center gap-1.5 px-2 h-8 ${modeColor}`}
        >
          <Timer className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
          <span className="font-mono text-sm tabular-nums">{formattedTime}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{modeLabel} time {isRunning ? 'running' : 'paused'}</p>
        <p className="text-xs text-muted-foreground">Click to open timer</p>
      </TooltipContent>
    </Tooltip>
  );
}
