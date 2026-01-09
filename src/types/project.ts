export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  color: string;
  start_date: string | null;
  end_date: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  task_count?: number;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';
export type ProjectColumn = 'todo' | 'in_progress' | 'done';

export const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#64748b', // Slate
];

export const PROJECT_COLUMN_CONFIG = [
  { value: 'todo' as const, label: 'To Do', icon: '📋' },
  { value: 'in_progress' as const, label: 'In Progress', icon: '🔄' },
  { value: 'done' as const, label: 'Done', icon: '✅' },
];
