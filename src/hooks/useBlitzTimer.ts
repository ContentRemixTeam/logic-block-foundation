import { useState, useEffect, useRef, useCallback } from 'react';
import { playTimerSound } from '@/lib/timerSound';
import { toast } from 'sonner';

export interface BlitzTask {
  id: string;
  text: string;
  estimatedMinutes: number | null;
  isCompleted: boolean;
  position: number;
  taskId: string | null;
}

interface BlitzTimerState {
  activeTaskId: string | null;
  timeRemaining: number;
  totalDuration: number;
  isRunning: boolean;
  isPaused: boolean;
}

interface UseBlitzTimerReturn {
  timerState: BlitzTimerState;
  activeTask: BlitzTask | null;
  startTimer: (task: BlitzTask) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  addMinutes: (minutes: number) => void;
  formatTime: (seconds: number) => string;
  isPipSupported: boolean;
  isPipActive: boolean;
  openPip: () => Promise<void>;
  closePip: () => void;
  pipWindow: Window | null;
}

export function useBlitzTimer(
  tasks: BlitzTask[],
  onTimerComplete: (taskId: string) => void
): UseBlitzTimerReturn {
  const [timerState, setTimerState] = useState<BlitzTimerState>({
    activeTaskId: null,
    timeRemaining: 0,
    totalDuration: 0,
    isRunning: false,
    isPaused: false,
  });
  
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const intervalRef = useRef<number | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  // Check if Document Picture-in-Picture is supported
  const isPipSupported = 'documentPictureInPicture' in window;

  const activeTask = tasks.find(t => t.id === timerState.activeTaskId) || null;

  // Timer tick effect
  useEffect(() => {
    if (timerState.isRunning && timerState.timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimerState(prev => {
          if (prev.timeRemaining <= 1) {
            // Timer complete!
            playTimerSound();
            
            // Show toast notification
            toast.info('⏰ Time\'s up!', {
              description: `Did you finish: ${activeTask?.text}?`,
              duration: 10000,
              action: {
                label: 'Done',
                onClick: () => {
                  if (prev.activeTaskId) {
                    onTimerComplete(prev.activeTaskId);
                  }
                },
              },
            });
            
            // Request browser notification if permitted
            if (Notification.permission === 'granted') {
              new Notification('⏰ Timer Complete', {
                body: activeTask?.text || 'Time to check your task!',
                icon: '/icons/icon-192x192.png',
              });
            }
            
            return { ...prev, isRunning: false, isPaused: false, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.timeRemaining, activeTask, onTimerComplete]);

  // Update PiP window when timer state changes
  useEffect(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      // Dispatch custom event to PiP window
      pipWindowRef.current.dispatchEvent(new CustomEvent('timer-update', {
        detail: { timerState, activeTask }
      }));
    }
  }, [timerState, activeTask]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startTimer = useCallback((task: BlitzTask) => {
    if (!task.estimatedMinutes) return;
    
    // Request notification permission on first timer start
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const durationSeconds = task.estimatedMinutes * 60;
    setTimerState({
      activeTaskId: task.id,
      timeRemaining: durationSeconds,
      totalDuration: durationSeconds,
      isRunning: true,
      isPaused: false,
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: true, isPaused: false }));
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setTimerState({
      activeTaskId: null,
      timeRemaining: 0,
      totalDuration: 0,
      isRunning: false,
      isPaused: false,
    });
  }, []);

  const addMinutes = useCallback((minutes: number) => {
    setTimerState(prev => ({
      ...prev,
      timeRemaining: prev.timeRemaining + (minutes * 60),
      totalDuration: prev.totalDuration + (minutes * 60),
    }));
  }, []);

  const openPip = useCallback(async () => {
    if (!isPipSupported) {
      toast.error('Picture-in-Picture not supported', {
        description: 'Your browser doesn\'t support the floating timer. Try Chrome or Edge.',
      });
      return;
    }

    try {
      // @ts-ignore - Document Picture-in-Picture API
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 180,
      });
      
      pipWindowRef.current = pipWindow;
      setPipWindow(pipWindow);
      setIsPipActive(true);

      // Copy styles to PiP window
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(style => {
        pipWindow.document.head.appendChild(style.cloneNode(true));
      });

      // Handle PiP window close
      pipWindow.addEventListener('pagehide', () => {
        setIsPipActive(false);
        setPipWindow(null);
        pipWindowRef.current = null;
      });

    } catch (error) {
      console.error('Failed to open PiP:', error);
      toast.error('Failed to open floating timer');
    }
  }, [isPipSupported]);

  const closePip = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    setIsPipActive(false);
    setPipWindow(null);
    pipWindowRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    };
  }, []);

  return {
    timerState,
    activeTask,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    addMinutes,
    formatTime,
    isPipSupported,
    isPipActive,
    openPip,
    closePip,
    pipWindow,
  };
}
