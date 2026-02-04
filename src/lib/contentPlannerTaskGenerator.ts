// Client-side Content Planner task generator for task preview
// Generates tasks from planned content items

import { ContentPlannerData, PlannedContentItem, ContentFormat } from '@/types/contentPlanner';
import { WizardTask } from '@/types/wizardTask';
import { getFormatMetadata } from '@/components/wizards/content-planner/utils/formatHelpers';

export interface ContentPlannerTask extends WizardTask {
  phase: 'create' | 'publish';
  contentItemId?: string;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function generateContentPlannerTasksPreview(data: ContentPlannerData): ContentPlannerTask[] {
  const tasks: ContentPlannerTask[] = [];
  
  if (!data.generateTasks) {
    return tasks;
  }

  data.plannedItems.forEach((item, index) => {
    const itemDate = item.date ? new Date(item.date) : new Date();
    const metadata = getFormatMetadata(item.type);
    const estimatedMinutes = metadata?.estimatedMinutes || 60;
    
    // Calculate creation date (3 days before publish by default)
    const createDate = addDays(itemDate, -3);
    
    // Creation task
    tasks.push({
      id: `content_create_${item.id}`,
      task_text: `Create: ${item.title}`,
      scheduled_date: formatDate(createDate),
      phase: 'create',
      priority: index < 3 ? 'high' : 'medium',
      estimated_minutes: estimatedMinutes,
      contentItemId: item.id,
    });
    
    // Publish task
    tasks.push({
      id: `content_publish_${item.id}`,
      task_text: `Publish: ${item.title}`,
      scheduled_date: item.date || formatDate(itemDate),
      phase: 'publish',
      priority: 'medium',
      estimated_minutes: 15,
      contentItemId: item.id,
    });
  });

  return tasks;
}

export const CONTENT_PLANNER_PHASE_CONFIG = [
  { key: 'create', label: 'Content Creation' },
  { key: 'publish', label: 'Publishing' },
];

export function groupContentTasksByPhase(tasks: ContentPlannerTask[]): Record<string, ContentPlannerTask[]> {
  const grouped: Record<string, ContentPlannerTask[]> = {
    create: [],
    publish: [],
  };
  
  tasks.forEach(task => {
    if (grouped[task.phase]) {
      grouped[task.phase].push(task);
    }
  });
  
  return grouped;
}
