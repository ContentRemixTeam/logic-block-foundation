// Shared wizard task types for task preview across all wizards

export interface WizardTask {
  id: string;
  task_text: string;
  scheduled_date: string | null;
  phase: string;
  priority: 'high' | 'medium' | 'low';
  estimated_minutes: number | null;
}

export interface TaskDateOverride {
  taskId: string;
  newDate: string;
}

export interface WizardTaskConfig {
  excludedTasks: string[];
  dateOverrides: TaskDateOverride[];
}

export const DEFAULT_WIZARD_TASK_CONFIG: WizardTaskConfig = {
  excludedTasks: [],
  dateOverrides: [],
};

// Helper to get task date with override
export function getTaskDate(task: WizardTask, overrides: TaskDateOverride[]): string | null {
  const override = overrides.find(o => o.taskId === task.id);
  return override?.newDate ?? task.scheduled_date;
}

// Helper to check if task is selected
export function isTaskSelected(taskId: string, excludedTasks: string[]): boolean {
  return !excludedTasks.includes(taskId);
}
