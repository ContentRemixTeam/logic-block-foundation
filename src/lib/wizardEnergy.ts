/**
 * Energy-aware wizard planning.
 *
 * Every plan a wizard generates should be adaptable to the energy the person
 * actually has. Two pieces:
 *
 *  1. inferEnergyCost() — tags each generated task with low / medium / high
 *     energy based on what the task actually asks of you.
 *  2. Plan pace — lets someone shape the whole generated plan up front
 *     ("gentle" trims the high-energy work, "steady" keeps most of it).
 */

export type EnergyCost = 'low' | 'medium' | 'high';

/** Verbs/phrases that reliably signal how draining a task is. */
const HIGH_ENERGY = [
  'record', 'film', 'video', 'live', 'webinar', 'workshop', 'launch', 'pitch',
  'call', 'coaching', 'interview', 'present', 'sales page', 'write the', 'outline the',
  'create the', 'build', 'design', 'draft the', 'plan the', 'strategy', 'masterclass',
  'summit', 'speak', 'sequence', 'onboard',
];

const LOW_ENERGY = [
  'schedule', 'post', 'publish', 'share', 'reply', 'respond', 'check', 'review',
  'read', 'update', 'send', 'confirm', 'upload', 'add', 'tidy', 'clean up',
  'skim', 'note', 'reminder', 'log', 'archive', 'rest', 'celebrate', 'reflect',
];

/**
 * Best-guess energy cost for a generated task.
 * Falls back to 'medium' — the neutral, always-visible bucket.
 */
export function inferEnergyCost(
  taskText: string,
  estimatedMinutes?: number | null,
): EnergyCost {
  const t = (taskText || '').toLowerCase();

  if (LOW_ENERGY.some((k) => t.includes(k))) {
    // A "review" that takes 90 minutes isn't actually a low-energy task.
    if (estimatedMinutes && estimatedMinutes >= 60) return 'medium';
    return 'low';
  }
  if (HIGH_ENERGY.some((k) => t.includes(k))) return 'high';

  if (estimatedMinutes != null) {
    if (estimatedMinutes <= 15) return 'low';
    if (estimatedMinutes >= 90) return 'high';
  }
  return 'medium';
}

/** Read an explicit energy_cost if the wizard set one, otherwise infer it. */
export function resolveEnergyCost(task: {
  task_text: string;
  energy_cost?: string | null;
  estimated_minutes?: number | null;
}): EnergyCost {
  const e = task.energy_cost;
  if (e === 'low' || e === 'medium' || e === 'high') return e;
  return inferEnergyCost(task.task_text, task.estimated_minutes);
}

export type PlanPace = 'gentle' | 'steady' | 'full';

export interface PlanPaceOption {
  value: PlanPace;
  label: string;
  helper: string;
  /** Energy levels kept when this pace is chosen. */
  keeps: EnergyCost[];
}

export const PLAN_PACE_OPTIONS: PlanPaceOption[] = [
  {
    value: 'gentle',
    label: 'Gentle',
    helper: 'Just the light-lift pieces. Everything else waits for you.',
    keeps: ['low'],
  },
  {
    value: 'steady',
    label: 'Steady',
    helper: 'A realistic plan — light and medium work, nothing draining.',
    keeps: ['low', 'medium'],
  },
  {
    value: 'full',
    label: 'Full plan',
    helper: 'Keep everything. You can always trim it later.',
    keeps: ['low', 'medium', 'high'],
  },
];

/**
 * Which task ids should be set aside for a given pace.
 * Nothing is deleted — excluded tasks simply aren't created yet.
 */
export function excludedIdsForPace<
  T extends { id: string; task_text: string; energy_cost?: string | null; estimated_minutes?: number | null },
>(tasks: T[], pace: PlanPace): string[] {
  const keeps = PLAN_PACE_OPTIONS.find((o) => o.value === pace)?.keeps ?? ['low', 'medium', 'high'];
  return tasks.filter((t) => !keeps.includes(resolveEnergyCost(t))).map((t) => t.id);
}

/** Count of tasks per energy level, for preview summaries. */
export function energyBreakdown<
  T extends { task_text: string; energy_cost?: string | null; estimated_minutes?: number | null },
>(tasks: T[]): Record<EnergyCost, number> {
  const out: Record<EnergyCost, number> = { low: 0, medium: 0, high: 0 };
  tasks.forEach((t) => { out[resolveEnergyCost(t)] += 1; });
  return out;
}
