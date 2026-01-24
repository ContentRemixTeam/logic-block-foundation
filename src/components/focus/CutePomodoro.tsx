import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArcade } from '@/hooks/useArcade';

interface CutePomodoroProps {
  activeTaskText?: string;
  onComplete?: () => void;
  className?: string;
}

type TimerState = 'idle' | 'running' | 'paused' | 'break';

const PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '45m', seconds: 45 * 60 },
];

const BREAK_DURATION = 5 * 60; // 5 minute break

export function CutePomodoro({ activeTaskText, onComplete, className }: CutePomodoroProps) {
  const { settings } = useArcade();
  const [state, setState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 120; // radius = 120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playSound = useCallback(() => {
    if (settings?.arcade_sounds_off) return;
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Could not play sound');
    }
  }, [settings?.arcade_sounds_off]);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            playSound();
            
            if (state === 'running') {
              // Focus session complete
              onComplete?.();
              setState('break');
              setTotalTime(BREAK_DURATION);
              return BREAK_DURATION;
            }
            
            setState('idle');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, playSound, onComplete]);

  // Handle break timer completion
  useEffect(() => {
    if (state === 'break' && timeRemaining <= 0) {
      playSound();
      setState('idle');
      setTimeRemaining(25 * 60);
      setTotalTime(25 * 60);
    }
  }, [state, timeRemaining, playSound]);

  const startTimer = (seconds: number) => {
    setTotalTime(seconds);
    setTimeRemaining(seconds);
    setState('running');
  };

  const pause = () => setState('paused');
  const resume = () => setState('running');
  
  const stop = () => {
    setState('idle');
    setTimeRemaining(25 * 60);
    setTotalTime(25 * 60);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const reset = () => {
    setTimeRemaining(totalTime);
    setState('running');
  };

  const isBreak = state === 'break';
  const isActive = state === 'running' || state === 'paused' || state === 'break';

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Timer Circle */}
      <div className="relative">
        <svg 
          width="280" 
          height="280" 
          className={cn(
            "transform -rotate-90 transition-all duration-300",
            state === 'running' && "animate-pulse"
          )}
        >
          {/* Background circle */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            className="opacity-30"
          />
          {/* Progress circle */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke={isBreak ? "hsl(var(--success, 142 76% 36%))" : "hsl(var(--primary))"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        
        {/* Timer Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "text-5xl font-mono font-bold tracking-tight",
            isBreak ? "text-green-500" : "text-foreground"
          )}>
            {formatTime(timeRemaining)}
          </span>
          <span className="text-sm text-muted-foreground mt-2">
            {isBreak ? '☕ Break time' : state === 'running' ? '🎯 Focus' : state === 'paused' ? '⏸️ Paused' : '✨ Ready'}
          </span>
        </div>
      </div>

      {/* Active Task Display */}
      {activeTaskText && state === 'running' && (
        <div className="text-center max-w-xs">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Currently focusing on</p>
          <p className="text-sm font-medium text-foreground line-clamp-2">{activeTaskText}</p>
        </div>
      )}

      {/* Controls */}
      {!isActive ? (
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map(preset => (
            <Button
              key={preset.label}
              variant="outline"
              size="lg"
              onClick={() => startTimer(preset.seconds)}
              className="min-w-[60px] rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex gap-3">
          {state === 'paused' ? (
            <Button onClick={resume} size="lg" className="rounded-full px-8">
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
          ) : state === 'running' || state === 'break' ? (
            <Button onClick={pause} variant="secondary" size="lg" className="rounded-full px-8">
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          ) : null}
          
          <Button onClick={reset} variant="ghost" size="lg" className="rounded-full">
            <RotateCcw className="h-5 w-5" />
          </Button>
          
          <Button onClick={stop} variant="ghost" size="lg" className="rounded-full text-destructive hover:text-destructive">
            <Square className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
