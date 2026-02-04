import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Timer, Play, Pause, X, Plus, Clock, Check } from 'lucide-react';
import type { BlitzTask } from '@/hooks/useBlitzTimer';

interface BlitzTaskCardProps {
  task: BlitzTask;
  isActive: boolean;
  timerRunning: boolean;
  timerPaused: boolean;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
  onUpdateTime: (taskId: string, minutes: number | null) => void;
  onStartTimer: (task: BlitzTask) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
  onComplete: (taskId: string) => void;
  onAddMinutes: (minutes: number) => void;
}

const TIME_PRESETS = [
  { value: 5, label: '5m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
];

export function BlitzTaskCard({
  task,
  isActive,
  timerRunning,
  timerPaused,
  timeRemaining,
  formatTime,
  onUpdateTime,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onComplete,
  onAddMinutes,
}: BlitzTaskCardProps) {
  const [showTimePopover, setShowTimePopover] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');

  const handleSelectTime = (minutes: number) => {
    onUpdateTime(task.id, minutes);
    setShowTimePopover(false);
  };

  const handleCustomTime = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0 && mins <= 480) {
      onUpdateTime(task.id, mins);
      setCustomMinutes('');
      setShowTimePopover(false);
    }
  };

  const progress = task.estimatedMinutes 
    ? ((task.estimatedMinutes * 60 - timeRemaining) / (task.estimatedMinutes * 60)) * 100 
    : 0;

  return (
    <Card className={cn(
      "transition-all duration-300",
      task.isCompleted && "opacity-60 bg-muted/30",
      isActive && !task.isCompleted && "ring-2 ring-primary shadow-lg",
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={task.isCompleted}
            disabled={task.isCompleted}
            onCheckedChange={() => onComplete(task.id)}
            className="mt-1 h-5 w-5"
          />

          <div className="flex-1 min-w-0">
            {/* Task Text */}
            <p className={cn(
              "font-medium text-sm leading-tight",
              task.isCompleted && "line-through text-muted-foreground"
            )}>
              {task.text}
            </p>

            {/* Time Estimate + Timer Controls */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Time Estimate Button/Display */}
              {!task.isCompleted && (
                <Popover open={showTimePopover} onOpenChange={setShowTimePopover}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant={task.estimatedMinutes ? "secondary" : "outline"} 
                      size="sm" 
                      className="h-7 text-xs gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      {task.estimatedMinutes 
                        ? `${task.estimatedMinutes}m` 
                        : 'Set time'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Estimated time</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TIME_PRESETS.map(preset => (
                          <Button
                            key={preset.value}
                            variant={task.estimatedMinutes === preset.value ? "default" : "outline"}
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => handleSelectTime(preset.value)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Custom mins"
                          value={customMinutes}
                          onChange={(e) => setCustomMinutes(e.target.value)}
                          className="h-7 text-xs"
                          min={1}
                          max={480}
                        />
                        <Button 
                          size="sm" 
                          className="h-7" 
                          onClick={handleCustomTime}
                          disabled={!customMinutes}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Timer Controls */}
              {!task.isCompleted && task.estimatedMinutes && !isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onStartTimer(task)}
                >
                  <Play className="h-3 w-3" />
                  Start
                </Button>
              )}
            </div>

            {/* Active Timer Display */}
            {isActive && !task.isCompleted && (
              <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className={cn(
                      "h-4 w-4 text-primary",
                      timerRunning && "animate-pulse"
                    )} />
                    <span className="font-mono font-bold text-lg text-primary">
                      {formatTime(timeRemaining)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Add 5 min */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => onAddMinutes(5)}
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      5m
                    </Button>

                    {/* Play/Pause */}
                    {timerRunning ? (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onPauseTimer}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : timerPaused ? (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onResumeTimer}>
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}

                    {/* Stop */}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={onStopTimer}>
                      <X className="h-4 w-4" />
                    </Button>

                    {/* Mark Done */}
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => onComplete(task.id)}
                    >
                      <Check className="h-3 w-3 mr-0.5" />
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
