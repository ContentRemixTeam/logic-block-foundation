import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';

type TimerMode = 'focus' | 'break' | 'idle';

interface PomodoroState {
  mode: TimerMode;
  timeRemaining: number; // in seconds
  isRunning: boolean;
  sessionId: string | null;
  linkedTaskId: string | null;
}

export function usePomodoro() {
  const { user } = useAuth();
  const { settings, refreshWallet } = useArcade();
  
  const [state, setState] = useState<PomodoroState>({
    mode: 'idle',
    timeRemaining: settings.pomodoro_focus_minutes * 60,
    isRunning: false,
    sessionId: null,
    linkedTaskId: null,
  });
  
  const intervalRef = useRef<number | null>(null);

  // Update time when settings change
  useEffect(() => {
    if (state.mode === 'idle') {
      setState(prev => ({
        ...prev,
        timeRemaining: settings.pomodoro_focus_minutes * 60,
      }));
    }
  }, [settings.pomodoro_focus_minutes, state.mode]);

  const startFocus = useCallback(async (taskId?: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('arcade_pomodoro_sessions')
        .insert({
          user_id: user.id,
          task_id: taskId || null,
          focus_minutes: settings.pomodoro_focus_minutes,
          break_minutes: settings.pomodoro_break_minutes,
          status: 'in_progress',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setState({
        mode: 'focus',
        timeRemaining: settings.pomodoro_focus_minutes * 60,
        isRunning: true,
        sessionId: data.id,
        linkedTaskId: taskId || null,
      });
    } catch (err) {
      console.error('Failed to start pomodoro:', err);
    }
  }, [user, settings]);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: true }));
  }, []);

  const reset = useCallback(() => {
    setState({
      mode: 'idle',
      timeRemaining: settings.pomodoro_focus_minutes * 60,
      isRunning: false,
      sessionId: null,
      linkedTaskId: null,
    });
  }, [settings.pomodoro_focus_minutes]);

  const completeSession = useCallback(async () => {
    if (!user || !state.sessionId) return;
    
    try {
      // Update session as completed
      await supabase
        .from('arcade_pomodoro_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', state.sessionId);
      
      // Award coins (with dedupe)
      const dedupeKey = `pomodoro_completed:${state.sessionId}`;
      
      await supabase.from('arcade_events').insert({
        user_id: user.id,
        event_type: 'pomodoro_completed',
        coins_delta: 10,
        metadata: { focus_minutes: settings.pomodoro_focus_minutes },
        dedupe_key: dedupeKey,
      });
      
      // Update wallet
      const { data: walletData } = await supabase
        .from('arcade_wallet')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (walletData) {
        await supabase
          .from('arcade_wallet')
          .update({
            coins_balance: (walletData.coins_balance || 0) + 10,
            total_coins_earned: (walletData.total_coins_earned || 0) + 10,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase.from('arcade_wallet').insert({
          user_id: user.id,
          coins_balance: 10,
          tokens_balance: 0,
          total_coins_earned: 10,
        });
      }
      
      await refreshWallet();
      
      // Start break or go idle
      if (settings.pomodoro_auto_start_break) {
        setState(prev => ({
          ...prev,
          mode: 'break',
          timeRemaining: settings.pomodoro_break_minutes * 60,
          isRunning: true,
        }));
      } else {
        setState(prev => ({
          ...prev,
          mode: 'break',
          timeRemaining: settings.pomodoro_break_minutes * 60,
          isRunning: false,
        }));
      }
    } catch (err) {
      console.error('Failed to complete pomodoro:', err);
    }
  }, [user, state.sessionId, settings, refreshWallet]);

  const completeBreak = useCallback(() => {
    setState({
      mode: 'idle',
      timeRemaining: settings.pomodoro_focus_minutes * 60,
      isRunning: false,
      sessionId: null,
      linkedTaskId: null,
    });
  }, [settings.pomodoro_focus_minutes]);

  // Timer tick
  useEffect(() => {
    if (state.isRunning && state.timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            if (prev.mode === 'focus') {
              completeSession();
            } else if (prev.mode === 'break') {
              completeBreak();
            }
            return prev;
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
  }, [state.isRunning, state.timeRemaining, state.mode, completeSession, completeBreak]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    ...state,
    formattedTime: formatTime(state.timeRemaining),
    startFocus,
    pause,
    resume,
    reset,
  };
}
