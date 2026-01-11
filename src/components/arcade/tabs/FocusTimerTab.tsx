import { usePomodoro } from '@/hooks/usePomodoro';
import { useArcade } from '@/hooks/useArcade';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Coins } from 'lucide-react';

export function FocusTimerTab() {
  const { mode, formattedTime, isRunning, startFocus, pause, resume, reset } = usePomodoro();
  const { settings } = useArcade();

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

  return (
    <div className="space-y-6">
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
              <Button size="lg" onClick={() => startFocus()} className="gap-2">
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
