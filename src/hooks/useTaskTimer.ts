import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'task_timer_state';

export interface TaskTimerState {
  activeTaskId: string | null;
  activeTaskText: string;
  startTime: string | null; // ISO string for localStorage
  pausedAt: string | null;
  accumulatedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
}

const initialState: TaskTimerState = {
  activeTaskId: null,
  activeTaskText: '',
  startTime: null,
  pausedAt: null,
  accumulatedSeconds: 0,
  isRunning: false,
  isPaused: false,
};

export interface TaskForTimer {
  task_id: string;
  task_text: string;
}

export function useTaskTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [timerState, setTimerState] = useState<TaskTimerState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialState;
    } catch {
      return initialState;
    }
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  // Calculate elapsed time
  const calculateElapsed = useCallback(() => {
    if (!timerState.startTime) return timerState.accumulatedSeconds;
    
    if (timerState.isPaused && timerState.pausedAt) {
      // Timer is paused - use the time when it was paused
      const startMs = new Date(timerState.startTime).getTime();
      const pausedMs = new Date(timerState.pausedAt).getTime();
      return timerState.accumulatedSeconds + Math.floor((pausedMs - startMs) / 1000);
    }
    
    if (timerState.isRunning) {
      // Timer is running - calculate from start to now
      const startMs = new Date(timerState.startTime).getTime();
      const nowMs = Date.now();
      return timerState.accumulatedSeconds + Math.floor((nowMs - startMs) / 1000);
    }
    
    return timerState.accumulatedSeconds;
  }, [timerState]);

  // Update elapsed seconds every second when running
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      setElapsedSeconds(calculateElapsed());
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsed());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedSeconds(calculateElapsed());
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, calculateElapsed]);

  const startTimer = useCallback((task: TaskForTimer) => {
    setTimerState({
      activeTaskId: task.task_id,
      activeTaskText: task.task_text,
      startTime: new Date().toISOString(),
      pausedAt: null,
      accumulatedSeconds: 0,
      isRunning: true,
      isPaused: false,
    });
  }, []);

  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning || timerState.isPaused) return;
    
    setTimerState(prev => ({
      ...prev,
      pausedAt: new Date().toISOString(),
      isPaused: true,
    }));
  }, [timerState.isRunning, timerState.isPaused]);

  const resumeTimer = useCallback(() => {
    if (!timerState.isPaused) return;
    
    // Calculate accumulated time and reset start time
    const accumulated = calculateElapsed();
    setTimerState(prev => ({
      ...prev,
      accumulatedSeconds: accumulated,
      startTime: new Date().toISOString(),
      pausedAt: null,
      isPaused: false,
    }));
  }, [timerState.isPaused, calculateElapsed]);

  const stopTimer = useCallback(async (): Promise<number> => {
    if (!timerState.activeTaskId || !user) {
      setTimerState(initialState);
      return 0;
    }

    const totalSeconds = calculateElapsed();
    const totalMinutes = Math.ceil(totalSeconds / 60);
    const startedAt = timerState.startTime;

    // Save time entry
    try {
      await supabase.from('time_entries').insert({
        user_id: user.id,
        task_id: timerState.activeTaskId,
        estimated_minutes: null,
        actual_minutes: totalMinutes,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        entry_type: 'timer',
      });

      // Update task's actual_minutes
      await supabase
        .from('tasks')
        .update({ actual_minutes: totalMinutes })
        .eq('task_id', timerState.activeTaskId);

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    } catch (error) {
      console.error('Failed to save time entry:', error);
    }

    setTimerState(initialState);
    return totalMinutes;
  }, [timerState, user, calculateElapsed, queryClient]);

  const completeAndStop = useCallback(async () => {
    if (!timerState.activeTaskId || !user) {
      setTimerState(initialState);
      return;
    }

    const totalSeconds = calculateElapsed();
    const totalMinutes = Math.ceil(totalSeconds / 60);
    const startedAt = timerState.startTime;
    const taskId = timerState.activeTaskId;

    try {
      // Save time entry
      await supabase.from('time_entries').insert({
        user_id: user.id,
        task_id: taskId,
        estimated_minutes: null,
        actual_minutes: totalMinutes,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        entry_type: 'timer',
      });

      // Mark task as completed with actual_minutes
      await supabase
        .from('tasks')
        .update({ 
          is_completed: true,
          status: 'done',
          completed_at: new Date().toISOString(),
          actual_minutes: totalMinutes 
        })
        .eq('task_id', taskId);

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }

    setTimerState(initialState);
  }, [timerState, user, calculateElapsed, queryClient]);

  const formatElapsed = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const isTimingTask = useCallback((taskId: string): boolean => {
    return timerState.activeTaskId === taskId && timerState.isRunning;
  }, [timerState.activeTaskId, timerState.isRunning]);

  return {
    timerState,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeAndStop,
    formatElapsed,
    isTimingTask,
  };
}
