import { format } from 'date-fns';
import type { Task } from '@/components/tasks/types';

export function buildScorecardBrief(tasks: Task[], weekStart: string, goal?: string | null) {
  const completed = tasks.filter(task => task.is_completed).length;
  const percentage = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const lines = tasks.map(task => {
    const date = task.scheduled_date || task.planned_day;
    const day = date ? format(new Date(`${date}T12:00:00`), 'EEE') : 'Unscheduled';
    return `- [${task.is_completed ? 'x' : ' '}] ${day}: ${task.task_text}${task.category ? ` (${task.category})` : ''}`;
  });

  return [
    'WEEKLY BUSINESS SCORECARD',
    `Week of ${format(new Date(`${weekStart}T12:00:00`), 'MMMM d, yyyy')}`,
    goal ? `90-day goal: ${goal}` : null,
    `Follow-through: ${completed}/${tasks.length} (${percentage}%)`,
    '',
    ...lines,
  ].filter(value => value !== null).join('\n');
}

export async function copyScorecardText(text: string) {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(text);
}
