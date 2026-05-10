import { useMemo } from 'react';
import { format } from 'date-fns';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useTasks } from '@/hooks/useTasks';
import { useBrainDump } from '@/hooks/useBrainDump';

export type NextBestActionKind =
  | 'create-cycle'
  | 'clear-overdue'
  | 'pick-top-three'
  | 'pick-low-energy'
  | 'review-brain-dump'
  | 'next-project-step'
  | 'all-clear';

export interface NextBestActionSuggestion {
  kind: NextBestActionKind;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  count?: number;
}

interface Options {
  /** Pass true if today's daily plan is marked low energy. */
  lowEnergyDay?: boolean;
}

/**
 * Deterministic, calm "what should I do next" picker.
 * Reads only existing data; no schema changes, no AI.
 */
export function useNextBestAction(opts: Options = {}): NextBestActionSuggestion {
  const { data: activeCycle, isLoading: cycleLoading } = useActiveCycle();
  const { tasks = [], isLoading: tasksLoading } = useTasks();
  const { items: brainDumpItems = [], isLoading: bdLoading } = useBrainDump();

  return useMemo<NextBestActionSuggestion>(() => {
    if (cycleLoading || tasksLoading || bdLoading) {
      return {
        kind: 'all-clear',
        title: 'Loading your day…',
        body: 'Pulling together what matters next.',
        ctaLabel: 'Open Today',
        href: '/daily-plan',
      };
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const openTasks = tasks.filter((t: any) => !t.is_completed);
    const todayTasks = openTasks.filter(
      (t: any) => t.scheduled_date === today || t.planned_day === today,
    );
    const overdue = openTasks.filter(
      (t: any) => t.scheduled_date && t.scheduled_date < today,
    );
    const lowEnergyAvailable = openTasks.filter(
      (t: any) => t.energy_level === 'low_energy',
    );
    const unprocessedBrainDump = brainDumpItems.filter(
      (i: any) => !i.converted_to && !i.archived_at,
    );

    if (!activeCycle) {
      return {
        kind: 'create-cycle',
        title: 'Set your 90-day focus',
        body: 'Pick the one outcome that defines this season.',
        ctaLabel: 'Create your 90-day focus',
        href: '/planning',
      };
    }

    if (overdue.length > 0) {
      return {
        kind: 'clear-overdue',
        title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
        body: 'Clear or reschedule them so today feels honest.',
        ctaLabel: 'Review overdue',
        href: '/tasks?tab=all',
        count: overdue.length,
      };
    }

    if (opts.lowEnergyDay && lowEnergyAvailable.length > 0) {
      return {
        kind: 'pick-low-energy',
        title: 'Low energy day',
        body: 'Pick one tiny next step. That counts.',
        ctaLabel: 'See low-energy tasks',
        href: '/tasks?energy=low_energy',
        count: lowEnergyAvailable.length,
      };
    }

    if (todayTasks.length === 0) {
      return {
        kind: 'pick-top-three',
        title: "Choose today's Top 3",
        body: 'Three things. That is the plan.',
        ctaLabel: 'Plan today',
        href: '/tasks?tab=today',
      };
    }

    if (unprocessedBrainDump.length > 0) {
      return {
        kind: 'review-brain-dump',
        title: `${unprocessedBrainDump.length} captured idea${unprocessedBrainDump.length > 1 ? 's' : ''}`,
        body: 'Sort the inbox so nothing slips.',
        ctaLabel: 'Review captures',
        href: '/brain-dump',
        count: unprocessedBrainDump.length,
      };
    }

    return {
      kind: 'all-clear',
      title: 'You know what matters.',
      body: 'Pick the next move on an active project.',
      ctaLabel: 'Open Projects',
      href: '/projects',
    };
  }, [activeCycle, tasks, brainDumpItems, cycleLoading, tasksLoading, bdLoading, opts.lowEnergyDay]);
}
