// Generates planner items from a completed Cycle Wizard plan.
// Returns plain task drafts that get fed into useResilientTaskMutation.

import { addDays, format, parseISO } from 'date-fns';

export interface CycleTaskDraft {
  task_text: string;
  task_description?: string;
  scheduled_date?: string;
  priority?: 'high' | 'medium' | 'low';
  energy_level?: 'low_energy' | 'medium' | 'high_focus';
  is_recurring?: boolean;
  recurrence_pattern?: string;
  system_source: string;
  template_key?: string;
  category?: string;
  estimated_minutes?: number;
}

export interface CycleTaskOptions {
  monthlyCheckins: boolean;
  weeklyPlanning: boolean;
  firstThreeDays: boolean;
  lowEnergyBackups: boolean;
  endOfCycleReview: boolean;
}

export const DEFAULT_CYCLE_TASK_OPTIONS: CycleTaskOptions = {
  monthlyCheckins: true,
  weeklyPlanning: true,
  firstThreeDays: true,
  lowEnergyBackups: true,
  endOfCycleReview: true,
};

interface MinimalCycleData {
  goal: string;
  startDate: string;
  endDate: string;
  weeklyPlanningDay?: string;
  weeklyDebriefDay?: string;
  metric1_name?: string;
  metric2_name?: string;
  metric3_name?: string;
}

const SYSTEM_SOURCE = 'cycle_wizard';

export function generateCycleTaskDrafts(
  data: MinimalCycleData,
  options: CycleTaskOptions = DEFAULT_CYCLE_TASK_OPTIONS,
): CycleTaskDraft[] {
  const drafts: CycleTaskDraft[] = [];
  const start = parseISO(data.startDate);

  // 1. Monthly check-ins (3, one per month of the cycle)
  if (options.monthlyCheckins) {
    for (let i = 1; i <= 3; i++) {
      const date = addDays(start, i * 28);
      drafts.push({
        task_text: `Month ${i} cycle check-in: review progress on "${data.goal}"`,
        scheduled_date: format(date, 'yyyy-MM-dd'),
        priority: 'high',
        energy_level: 'medium',
        system_source: SYSTEM_SOURCE,
        template_key: 'cycle_monthly_checkin',
        category: 'Review',
        estimated_minutes: 45,
      });
    }
  }

  // 2. Weekly planning recurring task
  if (options.weeklyPlanning && data.weeklyPlanningDay) {
    drafts.push({
      task_text: `Weekly planning — map this week to "${data.goal}"`,
      scheduled_date: format(start, 'yyyy-MM-dd'),
      priority: 'high',
      energy_level: 'high_focus',
      is_recurring: true,
      recurrence_pattern: 'weekly',
      system_source: SYSTEM_SOURCE,
      template_key: 'cycle_weekly_planning',
      category: 'Planning',
      estimated_minutes: 30,
    });
  }

  // 3. First 3 days of priority tasks (kickstart)
  if (options.firstThreeDays) {
    const metrics = [data.metric1_name, data.metric2_name, data.metric3_name].filter(Boolean) as string[];
    const seeds = metrics.length > 0
      ? metrics.map((m) => `Move the needle on ${m}`)
      : [
          `Take one action toward "${data.goal}"`,
          `Identify the next concrete step on "${data.goal}"`,
          `Block focus time for "${data.goal}"`,
        ];
    seeds.slice(0, 3).forEach((text, i) => {
      drafts.push({
        task_text: text,
        scheduled_date: format(addDays(start, i), 'yyyy-MM-dd'),
        priority: 'high',
        energy_level: 'high_focus',
        system_source: SYSTEM_SOURCE,
        template_key: 'cycle_kickstart',
        category: 'Cycle Goal',
        estimated_minutes: 60,
      });
    });
  }

  // 4. Low-energy backup tasks (one per week of cycle, first 4 weeks)
  if (options.lowEnergyBackups) {
    for (let i = 0; i < 4; i++) {
      drafts.push({
        task_text: `Low-energy task: review notes on "${data.goal}" (week ${i + 1})`,
        scheduled_date: format(addDays(start, i * 7 + 3), 'yyyy-MM-dd'),
        priority: 'low',
        energy_level: 'low_energy',
        system_source: SYSTEM_SOURCE,
        template_key: 'cycle_low_energy_backup',
        category: 'Backup',
        estimated_minutes: 15,
      });
    }
  }

  // 5. End-of-cycle review
  if (options.endOfCycleReview) {
    const end = parseISO(data.endDate);
    drafts.push({
      task_text: `End-of-cycle review: did "${data.goal}" happen?`,
      scheduled_date: format(end, 'yyyy-MM-dd'),
      priority: 'high',
      energy_level: 'high_focus',
      system_source: SYSTEM_SOURCE,
      template_key: 'cycle_end_review',
      category: 'Review',
      estimated_minutes: 60,
    });
  }

  return drafts;
}

export function summarizeCycleTaskCounts(drafts: CycleTaskDraft[]) {
  const byTemplate = new Map<string, number>();
  drafts.forEach((d) => {
    const key = d.template_key ?? 'other';
    byTemplate.set(key, (byTemplate.get(key) ?? 0) + 1);
  });
  return byTemplate;
}
