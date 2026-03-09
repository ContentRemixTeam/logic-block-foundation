// Engine Builder Task Generator
// Generates create & publish tasks from the engine blueprint

import type { EngineBuilderData } from '@/components/workshop/EngineBuilderTypes';
import type { WizardTask } from '@/types/wizardTask';
import { PLATFORMS } from '@/components/workshop/PlatformScorecardData';
import { format, addDays, nextMonday } from 'date-fns';

export const ENGINE_BUILDER_PHASE_CONFIG = [
  { key: 'setup', label: '🏗️ Engine Setup' },
  { key: 'lead-gen', label: '⛽ Lead Gen Content' },
  { key: 'nurture', label: '🔧 Nurture Content' },
  { key: 'convert', label: '🚀 Sales & Conversion' },
  { key: 'weekly-ops', label: '🏁 Weekly Operations' },
];

export function generateEngineBuilderTasksPreview(data: EngineBuilderData): WizardTask[] {
  const tasks: WizardTask[] = [];
  const startDate = nextMonday(new Date());
  let id = 0;
  const makeId = () => `engine-task-${++id}`;

  // --- SETUP PHASE ---
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

  // --- LEAD GEN CONTENT ---
  const platformName = PLATFORMS.find(p => p.id === data.primaryPlatform)?.name || data.customPlatform || 'Primary platform';

  // Generate 4 weeks of lead gen create + publish tasks
  for (let week = 0; week < 4; week++) {
    const weekStart = addDays(startDate, week * 7);
    const createDate = weekStart;
    const publishDate = addDays(weekStart, data.leadTimeDays || 1);

    tasks.push({
      id: makeId(),
      task_text: `Create Week ${week + 1} ${platformName} content${data.specificAction ? ` (${data.specificAction})` : ''}`,
      scheduled_date: format(createDate, 'yyyy-MM-dd'),
      phase: 'lead-gen',
      priority: week === 0 ? 'high' : 'medium',
      estimated_minutes: 60,
    });

    tasks.push({
      id: makeId(),
      task_text: `Publish Week ${week + 1} ${platformName} content`,
      scheduled_date: format(publishDate, 'yyyy-MM-dd'),
      phase: 'lead-gen',
      priority: 'medium',
      estimated_minutes: 15,
    });
  }

  // --- NURTURE CONTENT ---
  if (data.emailMethod) {
    for (let week = 0; week < 4; week++) {
      const weekStart = addDays(startDate, week * 7);
      tasks.push({
        id: makeId(),
        task_text: `Write Week ${week + 1} email newsletter`,
        scheduled_date: format(addDays(weekStart, 1), 'yyyy-MM-dd'),
        phase: 'nurture',
        priority: week === 0 ? 'high' : 'medium',
        estimated_minutes: 45,
      });
      tasks.push({
        id: makeId(),
        task_text: `Send Week ${week + 1} email newsletter`,
        scheduled_date: format(addDays(weekStart, 2), 'yyyy-MM-dd'),
        phase: 'nurture',
        priority: 'medium',
        estimated_minutes: 10,
      });
    }
  }

  if (data.secondaryNurture && data.secondaryNurture !== 'none') {
    const nurtureLabels: Record<string, string> = {
      podcast: 'podcast episode',
      youtube: 'YouTube video',
      blog: 'blog post',
      community: 'community post',
    };
    const label = nurtureLabels[data.secondaryNurture] || data.secondaryNurture;
    for (let week = 0; week < 4; week++) {
      const weekStart = addDays(startDate, week * 7);
      tasks.push({
        id: makeId(),
        task_text: `Create Week ${week + 1} ${label}`,
        scheduled_date: format(addDays(weekStart, 2), 'yyyy-MM-dd'),
        phase: 'nurture',
        priority: 'medium',
        estimated_minutes: 90,
      });
    }
  }

  // --- CONVERT ---
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

  // --- WEEKLY OPS ---
  const scheduleSlots = data.weeklySchedule.filter(s => s.activity);
  if (scheduleSlots.length > 0) {
    // Create recurring weekly tasks for the first 4 weeks
    for (let week = 0; week < 4; week++) {
      const weekStart = addDays(startDate, week * 7);
      const dayMap: Record<string, number> = {
        Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
        Friday: 4, Saturday: 5, Sunday: 6,
      };

      scheduleSlots.forEach(slot => {
        const dayOffset = dayMap[slot.day] ?? 0;
        const emoji = slot.type === 'create' ? '📦' : slot.type === 'publish' ? '📢' : '💬';
        tasks.push({
          id: makeId(),
          task_text: `${emoji} ${slot.day}: ${slot.activity}`,
          scheduled_date: format(addDays(weekStart, dayOffset), 'yyyy-MM-dd'),
          phase: 'weekly-ops',
          priority: 'medium',
          estimated_minutes: 30,
        });
      });
    }
  }

  return tasks;
}
