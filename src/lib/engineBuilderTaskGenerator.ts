// Engine Builder Task Generator
// Generates tasks from the engine blueprint,
// driven by the user's actual weekly schedule from Step 5.

import type { EngineBuilderData, WeeklySlot } from '@/components/workshop/EngineBuilderTypes';
import type { WizardTask } from '@/types/wizardTask';
import { PLATFORMS } from '@/components/workshop/PlatformScorecardData';
import { format, addDays, nextMonday } from 'date-fns';

export const ENGINE_BUILDER_PHASE_CONFIG = [
  { key: 'setup', label: '🏗️ Engine Setup' },
  { key: 'schedule', label: '📅 Weekly Schedule' },
  { key: 'convert', label: '🚀 Sales & Conversion' },
];

const DAY_OFFSET: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
};

function dayInWeek(weekStart: Date, day: string): Date {
  return addDays(weekStart, DAY_OFFSET[day] ?? 0);
}

export function generateEngineBuilderTasksPreview(data: EngineBuilderData): WizardTask[] {
  const tasks: WizardTask[] = [];
  const startDate = nextMonday(new Date());
  let id = 0;
  const makeId = () => `engine-task-${++id}`;

  const schedule = data.weeklySchedule || [];
  const platformName = PLATFORMS.find(p => p.id === data.primaryPlatform)?.name || data.customPlatform || 'Primary platform';

  // --- SETUP PHASE (one-off tasks, Week 1) ---
  if (data.freeTransformation) {
    tasks.push({
      id: makeId(),
      task_text: `Create lead magnet: "${data.freeTransformation}"`,
      scheduled_date: format(startDate, 'yyyy-MM-dd'),
      phase: 'setup',
      priority: 'high',
      estimated_minutes: 120,
    });
  }

  if (data.salesMethods.includes('sales-page')) {
    tasks.push({
      id: makeId(),
      task_text: `Write sales page for ${data.offerName || 'main offer'}`,
      scheduled_date: format(addDays(startDate, 1), 'yyyy-MM-dd'),
      phase: 'setup',
      priority: 'high',
      estimated_minutes: 180,
    });
  }

  if (data.emailMethod === 'sequence') {
    tasks.push({
      id: makeId(),
      task_text: 'Write welcome email sequence (3-5 emails)',
      scheduled_date: format(addDays(startDate, 2), 'yyyy-MM-dd'),
      phase: 'setup',
      priority: 'high',
      estimated_minutes: 120,
    });
  }

  // --- SCHEDULE-DRIVEN TASKS (from every slot in the user's weekly calendar) ---
  // Each slot in weeklySchedule becomes a recurring task for 4 weeks
  if (schedule.length > 0) {
    for (let week = 0; week < 4; week++) {
      const weekStart = addDays(startDate, week * 7);

      schedule.forEach(slot => {
        const emoji = slot.type === 'create' ? '🛠️' : slot.type === 'publish' ? '📢' : '💬';
        const activity = slot.activity || `${slot.type} ${platformName} content`;

        tasks.push({
          id: makeId(),
          task_text: `${emoji} ${activity}`,
          scheduled_date: format(dayInWeek(weekStart, slot.day), 'yyyy-MM-dd'),
          phase: 'schedule',
          priority: week === 0 ? 'high' : 'medium',
          estimated_minutes: slot.type === 'create' ? 60 : slot.type === 'publish' ? 15 : 30,
        });
      });
    }
  }

  // --- CONVERT (one-off sales tasks) ---
  if (data.salesMethods.includes('webinar')) {
    tasks.push({
      id: makeId(),
      task_text: 'Plan and schedule webinar/masterclass',
      scheduled_date: format(addDays(startDate, 7), 'yyyy-MM-dd'),
      phase: 'convert',
      priority: 'high',
      estimated_minutes: 60,
    });
  }

  if (data.salesMethods.includes('email-launch')) {
    tasks.push({
      id: makeId(),
      task_text: 'Write email launch sequence (5-7 emails)',
      scheduled_date: format(addDays(startDate, 14), 'yyyy-MM-dd'),
      phase: 'convert',
      priority: 'high',
      estimated_minutes: 180,
    });
  }

  if (data.salesMethods.includes('challenge-launch')) {
    tasks.push({
      id: makeId(),
      task_text: 'Plan challenge/launch event content',
      scheduled_date: format(addDays(startDate, 7), 'yyyy-MM-dd'),
      phase: 'convert',
      priority: 'high',
      estimated_minutes: 120,
    });
  }

  return tasks;
}
