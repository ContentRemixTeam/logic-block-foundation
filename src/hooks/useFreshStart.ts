/**
 * Fresh Start — bulk "life happens" reset actions.
 *
 * Nothing here deletes. Every action is:
 *   - additive to `archived_at` (which is nullable and reversible), OR
 *   - a bulk reschedule that only shifts `scheduled_date`.
 *
 * All operations return a small `UndoToken` that the UI can pass back to
 * `undoFreshStart()` for ~20 seconds after the action.
 */
import { useCallback, useRef } from 'react';
import { format, addDays, startOfWeek, isBefore } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

export type MoveMode = 'today' | 'this_week' | 'unscheduled';

export interface FreshStartCounts {
  overdueTasks: number;
  stalePlans: number;
  completedOlderThan30: number;
  completedOlderThan60: number;
  completedOlderThan90: number;
}

type UndoRecord =
  | {
      kind: 'archive_tasks';
      taskIds: string[];
    }
  | {
      kind: 'archive_plans';
      planIds: string[];
    }
  | {
      kind: 'reschedule_tasks';
      previous: Array<{ task_id: string; scheduled_date: string | null }>;
    };

export interface UndoToken {
  id: string;
  createdAt: number;
  records: UndoRecord[];
  summary: string;
}

const today = () => format(new Date(), 'yyyy-MM-dd');

async function fetchOverdueTaskIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('task_id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .eq('is_completed', false)
    .lt('scheduled_date', today());
  if (error) throw error;
  return (data ?? []).map((r) => r.task_id);
}

async function fetchStalePlanIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_plans')
    .select('day_id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .lt('date', today());
  if (error) throw error;
  return (data ?? []).map((r) => r.day_id);
}

async function fetchCompletedOlderThan(
  userId: string,
  days: number,
): Promise<string[]> {
  const cutoff = format(addDays(new Date(), -days), 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('tasks')
    .select('task_id, completed_at')
    .eq('user_id', userId)
    .is('archived_at', null)
    .eq('is_completed', true)
    .lt('completed_at', cutoff);
  if (error) throw error;
  return (data ?? []).map((r) => r.task_id);
}

export function useFreshStart() {
  const { user } = useAuth();
  const qc = useQueryClient();
  // Keep the latest undo in memory; UI reads it via the returned token.
  const lastUndoRef = useRef<UndoToken | null>(null);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['daily-plan'] });
    qc.invalidateQueries({ queryKey: ['fresh-start-counts'] });
    qc.invalidateQueries({ queryKey: ['archived-tasks'] });
    qc.invalidateQueries({ queryKey: ['archived-plans'] });
  }, [qc]);

  const previewCounts = useCallback(async (): Promise<FreshStartCounts> => {
    if (!user) {
      return {
        overdueTasks: 0,
        stalePlans: 0,
        completedOlderThan30: 0,
        completedOlderThan60: 0,
        completedOlderThan90: 0,
      };
    }
    const [overdue, plans, c30, c60, c90] = await Promise.all([
      fetchOverdueTaskIds(user.id),
      fetchStalePlanIds(user.id),
      fetchCompletedOlderThan(user.id, 30),
      fetchCompletedOlderThan(user.id, 60),
      fetchCompletedOlderThan(user.id, 90),
    ]);
    return {
      overdueTasks: overdue.length,
      stalePlans: plans.length,
      completedOlderThan30: c30.length,
      completedOlderThan60: c60.length,
      completedOlderThan90: c90.length,
    };
  }, [user]);

  const archiveTaskIds = useCallback(
    async (taskIds: string[]) => {
      if (!user || taskIds.length === 0) return;
      const { error } = await supabase
        .from('tasks')
        .update({ archived_at: new Date().toISOString() })
        .in('task_id', taskIds)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    [user],
  );

  const restoreTaskIds = useCallback(
    async (taskIds: string[]) => {
      if (!user || taskIds.length === 0) return;
      const { error } = await supabase
        .from('tasks')
        .update({ archived_at: null })
        .in('task_id', taskIds)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    [user],
  );

  const archivePlanIds = useCallback(
    async (planIds: string[]) => {
      if (!user || planIds.length === 0) return;
      const { error } = await supabase
        .from('daily_plans')
        .update({ archived_at: new Date().toISOString() })
        .in('day_id', planIds)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    [user],
  );

  const restorePlanIds = useCallback(
    async (planIds: string[]) => {
      if (!user || planIds.length === 0) return;
      const { error } = await supabase
        .from('daily_plans')
        .update({ archived_at: null })
        .in('day_id', planIds)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    [user],
  );

  /** "Fresh start" — archive everything overdue/stale before today. */
  const archiveOverdue = useCallback(async (): Promise<UndoToken> => {
    if (!user) throw new Error('not signed in');
    const [taskIds, planIds] = await Promise.all([
      fetchOverdueTaskIds(user.id),
      fetchStalePlanIds(user.id),
    ]);
    await Promise.all([archiveTaskIds(taskIds), archivePlanIds(planIds)]);
    const token: UndoToken = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      summary: `Archived ${taskIds.length} task${taskIds.length === 1 ? '' : 's'}${
        planIds.length ? ` and ${planIds.length} past plan${planIds.length === 1 ? '' : 's'}` : ''
      }`,
      records: [
        { kind: 'archive_tasks', taskIds },
        { kind: 'archive_plans', planIds },
      ],
    };
    lastUndoRef.current = token;
    invalidate();
    return token;
  }, [user, archiveTaskIds, archivePlanIds, invalidate]);

  /** "Move forward" — bulk-reschedule overdue tasks. Keeps history for undo. */
  const moveOverdueForward = useCallback(
    async (mode: MoveMode): Promise<UndoToken> => {
      if (!user) throw new Error('not signed in');
      const { data: rows, error } = await supabase
        .from('tasks')
        .select('task_id, scheduled_date')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .eq('is_completed', false)
        .lt('scheduled_date', today());
      if (error) throw error;

      const previous = (rows ?? []).map((r) => ({
        task_id: r.task_id,
        scheduled_date: r.scheduled_date,
      }));
      if (previous.length === 0) {
        const token: UndoToken = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          summary: 'Nothing to move — you were already clear.',
          records: [],
        };
        return token;
      }

      // Compute the new date per task
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekdayDates = Array.from({ length: 5 }, (_, i) =>
        format(addDays(weekStart, i), 'yyyy-MM-dd'),
      ).filter((d) => !isBefore(new Date(d), new Date(today()))); // only today+

      const updates: Array<{ task_id: string; scheduled_date: string | null }> =
        previous.map((p, idx) => {
          if (mode === 'today') {
            return { task_id: p.task_id, scheduled_date: today() };
          }
          if (mode === 'unscheduled') {
            return { task_id: p.task_id, scheduled_date: null };
          }
          // this_week — round-robin across remaining weekdays (fallback: today)
          const bucket = weekdayDates.length > 0 ? weekdayDates : [today()];
          return { task_id: p.task_id, scheduled_date: bucket[idx % bucket.length] };
        });

      // Apply updates. Group by target date to minimise round-trips.
      const byDate = new Map<string | null, string[]>();
      for (const u of updates) {
        const arr = byDate.get(u.scheduled_date) ?? [];
        arr.push(u.task_id);
        byDate.set(u.scheduled_date, arr);
      }
      for (const [date, ids] of byDate) {
        const { error: upErr } = await supabase
          .from('tasks')
          .update({ scheduled_date: date })
          .in('task_id', ids)
          .eq('user_id', user.id);
        if (upErr) throw upErr;
      }

      const summaryLabel: Record<MoveMode, string> = {
        today: 'today',
        this_week: 'this week',
        unscheduled: 'the unscheduled pool',
      };
      const token: UndoToken = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        summary: `Moved ${previous.length} task${previous.length === 1 ? '' : 's'} to ${summaryLabel[mode]}`,
        records: [{ kind: 'reschedule_tasks', previous }],
      };
      lastUndoRef.current = token;
      invalidate();
      return token;
    },
    [user, invalidate],
  );

  /** Archive completed items older than N days. */
  const archiveCompletedOlderThan = useCallback(
    async (days: number): Promise<UndoToken> => {
      if (!user) throw new Error('not signed in');
      const ids = await fetchCompletedOlderThan(user.id, days);
      await archiveTaskIds(ids);
      const token: UndoToken = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        summary: `Archived ${ids.length} completed task${ids.length === 1 ? '' : 's'} older than ${days} days`,
        records: [{ kind: 'archive_tasks', taskIds: ids }],
      };
      lastUndoRef.current = token;
      invalidate();
      return token;
    },
    [user, archiveTaskIds, invalidate],
  );

  /** Archive everything (tasks + plans) with a date/completed_at before `beforeDate`. */
  const archiveBefore = useCallback(
    async (beforeDate: string): Promise<UndoToken> => {
      if (!user) throw new Error('not signed in');
      const [{ data: tasks, error: e1 }, { data: plans, error: e2 }] =
        await Promise.all([
          supabase
            .from('tasks')
            .select('task_id')
            .eq('user_id', user.id)
            .is('archived_at', null)
            .or(`scheduled_date.lt.${beforeDate},completed_at.lt.${beforeDate}`),
          supabase
            .from('daily_plans')
            .select('day_id')
            .eq('user_id', user.id)
            .is('archived_at', null)
            .lt('date', beforeDate),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const taskIds = (tasks ?? []).map((r) => r.task_id);
      const planIds = (plans ?? []).map((r) => r.day_id);
      await Promise.all([archiveTaskIds(taskIds), archivePlanIds(planIds)]);
      const token: UndoToken = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        summary: `Archived ${taskIds.length + planIds.length} item${taskIds.length + planIds.length === 1 ? '' : 's'} from before ${beforeDate}`,
        records: [
          { kind: 'archive_tasks', taskIds },
          { kind: 'archive_plans', planIds },
        ],
      };
      lastUndoRef.current = token;
      invalidate();
      return token;
    },
    [user, archiveTaskIds, archivePlanIds, invalidate],
  );

  const undo = useCallback(
    async (token: UndoToken) => {
      if (!user) return;
      for (const record of token.records) {
        if (record.kind === 'archive_tasks') {
          await restoreTaskIds(record.taskIds);
        } else if (record.kind === 'archive_plans') {
          await restorePlanIds(record.planIds);
        } else if (record.kind === 'reschedule_tasks') {
          // Restore prior scheduled_date task by task (grouped by date for speed)
          const byDate = new Map<string | null, string[]>();
          for (const p of record.previous) {
            const arr = byDate.get(p.scheduled_date) ?? [];
            arr.push(p.task_id);
            byDate.set(p.scheduled_date, arr);
          }
          for (const [date, ids] of byDate) {
            await supabase
              .from('tasks')
              .update({ scheduled_date: date })
              .in('task_id', ids)
              .eq('user_id', user.id);
          }
        }
      }
      lastUndoRef.current = null;
      invalidate();
    },
    [user, restoreTaskIds, restorePlanIds, invalidate],
  );

  return {
    previewCounts,
    archiveOverdue,
    moveOverdueForward,
    archiveCompletedOlderThan,
    archiveBefore,
    undo,
    restoreTaskIds,
    restorePlanIds,
  };
}
