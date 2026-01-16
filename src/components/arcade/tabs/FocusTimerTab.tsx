import { useState } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useArcade } from '@/hooks/useArcade';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Coins, Target, CheckCircle2 } from 'lucide-react';

export function FocusTimerTab() {
  const { mode, formattedTime, isRunning, linkedTaskId, startFocus, pause, resume, reset } = usePomodoro();
  const { settings } = useArcade();
  const { data: tasks = [] } = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Filter to only show incomplete tasks
  const incompleteTasks = tasks.filter(t => !t.is_completed);
  
  // Get the linked task name
  const linkedTask = tasks.find(t => t.task_id === linkedTaskId);
  const selectedTask = tasks.find(t => t.task_id === selectedTaskId);

  const getModeDisplay = () => {
    switch (mode) {
      case 'focus':
        return { label: 'Focus Time', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20' };
      case 'break':
        return { label: 'Break Time', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/20' };
      default:
        return { label: 'Ready to Focus', color: 'text-muted-foreground', bg: '' };
    }
  };

  const modeDisplay = getModeDisplay();

  const handleStartFocus = () => {
    startFocus(selectedTaskId || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Task Selection (only when idle) */}
      {mode === 'idle' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              What will you focus on?
            </CardTitle>
            <CardDescription>
              Select a task or start a free focus session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTaskId || 'none'} onValueChange={(val) => setSelectedTaskId(val === 'none' ? null : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No task - free focus</SelectItem>
                {incompleteTasks.slice(0, 20).map((task) => (
                  <SelectItem key={task.task_id} value={task.task_id}>
                    <span className="truncate max-w-[250px] block">{task.task_text}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTask && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {selectedTask.task_text}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show linked task during focus */}
      {mode === 'focus' && linkedTask && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium truncate">Focusing on:</span>
              <span className="text-muted-foreground truncate">{linkedTask.task_text}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer display */}
      <Card className={modeDisplay.bg}>
        <CardHeader className="text-center pb-2">
          <CardTitle className={modeDisplay.color}>{modeDisplay.label}</CardTitle>
          {mode === 'idle' && (
            <CardDescription>
              {settings.pomodoro_focus_minutes} min focus, {settings.pomodoro_break_minutes} min break
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {/* Big timer display */}
          <div className={`text-7xl font-mono font-bold ${modeDisplay.color} mb-6`}>
            {formattedTime}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {mode === 'idle' ? (
              <Button size="lg" onClick={handleStartFocus} className="gap-2">
                <Play className="h-5 w-5" />
                Start Focus
              </Button>
            ) : (
              <>
                {isRunning ? (
                  <Button size="lg" variant="outline" onClick={pause} className="gap-2">
                    <Pause className="h-5 w-5" />
                    Pause
                  </Button>
                ) : (
                  <Button size="lg" onClick={resume} className="gap-2">
                    <Play className="h-5 w-5" />
                    Resume
                  </Button>
                )}
                <Button size="lg" variant="ghost" onClick={reset} className="gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </Button>
              </>
            )}
          </div>

          {/* Reward indicator */}
          {mode === 'focus' && (
            <div className="mt-6 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
              <Coins className="h-4 w-4" />
              <span className="text-sm font-medium">+10 coins on completion</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Focus Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>🎯 Complete a focus session to earn 10 coins</p>
          <p>🔕 Put your phone on silent mode</p>
          <p>💧 Have water nearby</p>
          <p>✅ After the break, tackle the next task!</p>
        </CardContent>
      </Card>
    </div>
  );
}
