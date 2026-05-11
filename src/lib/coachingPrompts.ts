/**
 * Curated coaching prompts shown contextually around the planner.
 * Mastermind voice — gentle, direct, no shame.
 */

export type PromptContext =
  | 'tasks_unconnected'
  | 'today_no_brave_move'
  | 'weekly_over_capacity'
  | 'task_stuck'
  | 'weekly_no_outcome';

export const COACHING_PROMPTS: Record<PromptContext, string[]> = {
  tasks_unconnected: [
    'Is this task moving the business forward, or helping you feel productive?',
    'Which of these would move money this week if you actually shipped it?',
    'What would your future self thank you for tagging right now?',
  ],
  today_no_brave_move: [
    "What's the sales-generating version of today?",
    'What is the one brave thing you would do if you trusted this could work?',
    "What's the next visible action — not the next planning task?",
  ],
  weekly_over_capacity: [
    'What would you do if you trusted this could work?',
    "What's the minimum viable version of this week?",
    'Which 3 things, if done, would make this week a win regardless?',
  ],
  task_stuck: [
    'What is the simpler version of this task?',
    'What would "done enough" look like here?',
    'Is this unclear, scary, too big — or no longer important?',
  ],
  weekly_no_outcome: [
    'What is the ONE business outcome for this week?',
    'If you only did one thing this week, what would matter most?',
  ],
};

export function pickPrompt(context: PromptContext, seed?: string | number): string {
  const list = COACHING_PROMPTS[context] ?? [];
  if (list.length === 0) return '';
  const seedNum =
    typeof seed === 'number'
      ? seed
      : typeof seed === 'string'
      ? Array.from(seed).reduce((s, c) => s + c.charCodeAt(0), 0)
      : Math.floor(Math.random() * 10000);
  return list[seedNum % list.length];
}
