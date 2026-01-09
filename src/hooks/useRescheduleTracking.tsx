/**
 * Reschedule Loop Detection Hook
 * 
 * QA CHECKLIST:
 * - Move a task 3 times → banner appears
 * - Push a task out by 7+ days → banner appears
 * - Banner suppressed after dismiss for 24h
 * - Tap banner → micro prompt opens
 * - Save micro prompt → entry saved + visible in coaching log
 * - "Open full thought work" works and pre-fills
 * - Reschedule count updates correctly only on real schedule changes
 * - Changes reflect across all pages immediately
 * - RLS prevents seeing other users' history/entries
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { taskQueryKeys } from '@/hooks/useTasks';
import { differenceInDays, subDays, parseISO } from 'date-fns';

export interface ScheduleChange {
  taskId: string;
  previousScheduledAt: string | null;
  newScheduledAt: string | null;
  previousDueDate: string | null;
  newDueDate: string | null;
  changeSource: 'weekly_planner_drag' | 'task_drawer' | 'tasks_list' | 'api' | 'daily_planner';
}

export interface RescheduleLoopState {
  isInLoop: boolean;
  rescheduleCount: number;
  daysPushed: number;
  isDismissed: boolean;
}

// Threshold constants
const RESCHEDULE_COUNT_THRESHOLD = 3;
const DAYS_PUSHED_THRESHOLD = 7;
const DISMISS_DURATION_HOURS = 24;

export function useRescheduleTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Log a schedule change and update the task's reschedule metrics
   * Call this whenever a task's scheduled_date, planned_day, or due date changes
   */
  const logScheduleChange = useCallback(async (change: ScheduleChange) => {
    if (!user) return;

    // Skip if no actual change occurred
    const hasScheduleChange = change.previousScheduledAt !== change.newScheduledAt;
    const hasDueDateChange = change.previousDueDate !== change.newDueDate;
    
    if (!hasScheduleChange && !hasDueDateChange) {
      return;
    }

    try {
      // Insert into history table
      const { error: historyError } = await supabase
        .from('task_schedule_history')
        .insert({
          user_id: user.id,
          task_id: change.taskId,
          previous_scheduled_at: change.previousScheduledAt,
          new_scheduled_at: change.newScheduledAt,
          previous_due_date: change.previousDueDate,
          new_due_date: change.newDueDate,
          change_source: change.changeSource,
        });

      if (historyError) {
        console.error('Failed to log schedule change:', historyError);
        return;
      }

      // Fetch the task to get/set original values and calculate metrics
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('original_scheduled_at, original_due_date, reschedule_nudge_dismissed_until')
        .eq('task_id', change.taskId)
        .eq('user_id', user.id)
        .single();

      if (taskError || !task) {
        console.error('Failed to fetch task for reschedule tracking:', taskError);
        return;
      }

      // Set original values if not already set
      const updates: Record<string, any> = {
        last_rescheduled_at: new Date().toISOString(),
      };

      if (!task.original_scheduled_at && change.previousScheduledAt) {
        updates.original_scheduled_at = change.previousScheduledAt;
      }
      if (!task.original_due_date && change.previousDueDate) {
        updates.original_due_date = change.previousDueDate;
      }

      // Count changes in the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { count, error: countError } = await supabase
        .from('task_schedule_history')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', change.taskId)
        .eq('user_id', user.id)
        .gte('changed_at', thirtyDaysAgo);

      if (!countError) {
        updates.reschedule_count_30d = count || 0;
      }

      // Calculate if pushed 7+ days
      let daysPushed = 0;
      const originalScheduled = task.original_scheduled_at || change.previousScheduledAt;
      const originalDue = task.original_due_date || change.previousDueDate;

      if (originalScheduled && change.newScheduledAt) {
        daysPushed = differenceInDays(
          parseISO(change.newScheduledAt),
          parseISO(originalScheduled)
        );
      } else if (originalDue && change.newDueDate) {
        daysPushed = differenceInDays(
          parseISO(change.newDueDate),
          parseISO(originalDue)
        );
      }

      // Determine if in reschedule loop
      const rescheduleCount = updates.reschedule_count_30d || 0;
      const isInLoop = rescheduleCount >= RESCHEDULE_COUNT_THRESHOLD || daysPushed >= DAYS_PUSHED_THRESHOLD;
      updates.reschedule_loop_active = isInLoop;

      // Update the task
      await supabase
        .from('tasks')
        .update(updates)
        .eq('task_id', change.taskId)
        .eq('user_id', user.id);

      // Invalidate task cache to reflect changes
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });

    } catch (error) {
      console.error('Error in logScheduleChange:', error);
    }
  }, [user, queryClient]);

  /**
   * Dismiss the reschedule nudge for a task for 24 hours
   */
  const dismissNudge = useCallback(async (taskId: string) => {
    if (!user) return;

    const dismissUntil = new Date();
    dismissUntil.setHours(dismissUntil.getHours() + DISMISS_DURATION_HOURS);

    try {
      await supabase
        .from('tasks')
        .update({ reschedule_nudge_dismissed_until: dismissUntil.toISOString() })
        .eq('task_id', taskId)
        .eq('user_id', user.id);

      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    } catch (error) {
      console.error('Error dismissing nudge:', error);
    }
  }, [user, queryClient]);

  /**
   * Check if a task should show the reschedule loop banner
   */
  const shouldShowBanner = useCallback((task: {
    reschedule_loop_active?: boolean;
    reschedule_nudge_dismissed_until?: string | null;
    reschedule_count_30d?: number;
  }): boolean => {
    if (!task.reschedule_loop_active) return false;

    // Check if dismissed
    if (task.reschedule_nudge_dismissed_until) {
      const dismissedUntil = new Date(task.reschedule_nudge_dismissed_until);
      if (dismissedUntil > new Date()) {
        return false;
      }
    }

    return true;
  }, []);

  return {
    logScheduleChange,
    dismissNudge,
    shouldShowBanner,
    RESCHEDULE_COUNT_THRESHOLD,
    DAYS_PUSHED_THRESHOLD,
  };
}