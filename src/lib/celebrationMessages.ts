/**
 * Rotating pools of warm, energy-aware celebration copy.
 * Rule: celebrate effort, never volume. Never compare to bigger days.
 * Never imply the user "should" do more.
 */

export type CelebrationMoment =
  | 'task_complete'
  | 'first_task'
  | 'bare_minimum_all'
  | 'bare_minimum_all_low_battery'
  | 'daily_plan_complete'
  | 'weekly_review'
  | 'cycle_milestone_25'
  | 'cycle_milestone_50'
  | 'cycle_milestone_75'
  | 'cycle_milestone_100';

const POOLS: Record<CelebrationMoment, string[]> = {
  task_complete: [
    'Done is done.',
    'That counts.',
    'One step. Nice.',
    'Ticked. Onward gently.',
  ],
  first_task: [
    'First task done — welcome in. 🌱',
    "You've started. That's the hard part.",
  ],
  bare_minimum_all: [
    "That's a win. Your day counts.",
    'Bare minimum: complete. This is a full day.',
    'You showed up today. That matters.',
  ],
  bare_minimum_all_low_battery: [
    'You did it on a low-battery day. That is huge. 💛',
    "Rest-mode success. Today counts, fully.",
    'Small energy, real progress. Proud of you.',
  ],
  daily_plan_complete: [
    "Today's plan: done. Rest well.",
    'You closed today. Nicely done.',
    "That's a wrap on today. 🌙",
  ],
  weekly_review: [
    'Weekly review saved. You gave this week its due.',
    'Reflection done — that itself is a win.',
  ],
  cycle_milestone_25: [
    "25% into your cycle. You're moving. 🌱",
  ],
  cycle_milestone_50: [
    "Halfway through your 90 days. Beautiful pacing. 🌿",
  ],
  cycle_milestone_75: [
    "75% in. The finish line is in view. 🌳",
  ],
  cycle_milestone_100: [
    'You completed a 90-day cycle. That is real. 🎉',
  ],
};

export function pickMessage(moment: CelebrationMoment): string {
  const pool = POOLS[moment];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function celebrationConfettiType(
  moment: CelebrationMoment,
): 'task_complete' | 'habit_logged' | 'streak' | 'all_done' | 'milestone' | 'low_battery' {
  switch (moment) {
    case 'task_complete':
      return 'task_complete';
    case 'first_task':
    case 'bare_minimum_all':
    case 'daily_plan_complete':
      return 'all_done';
    // Extra-warm, gentler variant — no confetti storm on hard days.
    case 'bare_minimum_all_low_battery':
      return 'low_battery';
    case 'weekly_review':
      return 'milestone';
    case 'cycle_milestone_25':
    case 'cycle_milestone_50':
    case 'cycle_milestone_75':
    case 'cycle_milestone_100':
      return 'milestone';
  }
}
