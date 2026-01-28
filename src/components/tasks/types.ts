// Task type definitions for the enhanced task manager

export interface ChecklistItem {
  id: string;
  text: string;
  order: number;
}

export interface SOPLink {
  id: string;
  title: string;
  url: string;
}

export interface SOP {
  sop_id: string;
  sop_name: string;
  description: string | null;
  checklist_items: ChecklistItem[];
  links: SOPLink[];
  notes: string | null;
}

export interface ChecklistProgress {
  item_id: string;
  completed: boolean;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  task_id: string;
  task_text: string;
  task_description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  time_slot_duration: number | null;
  priority: string | null;
  source: string | null;
  created_at: string;
  recurrence_pattern: string | null;
  recurrence_days: string[] | null;
  parent_task_id: string | null;
  is_recurring_parent: boolean;
  sop_id: string | null;
  checklist_progress: ChecklistProgress[] | null;
  sop: SOP | null;
  priority_order: number | null;
  // Enhanced fields
  estimated_minutes: number | null;
  actual_minutes: number | null;
  time_block_start: string | null;
  time_block_end: string | null;
  energy_level: 'high_focus' | 'medium' | 'low_energy' | null;
  context_tags: string[] | null;
  goal_id: string | null;
  status: 'focus' | 'scheduled' | 'backlog' | 'waiting' | 'someday' | null;
  waiting_on: string | null;
  subtasks: Subtask[] | null;
  notes: string | null;
  position_in_column: number | null;
  // Weekly planning fields
  planned_day: string | null;
  day_order: number | null;
  // Project fields
  project_id: string | null;
  project_column: 'todo' | 'in_progress' | 'done' | null;
  project?: { 
    id: string; 
    name: string; 
    color: string; 
    is_launch?: boolean;
    launch_start_date?: string | null;
    launch_end_date?: string | null;
  } | null;
  section_id: string | null;
  // Cycle automation fields
  cycle_id: string | null;
  is_system_generated: boolean | null;
  system_source: string | null;
  template_key: string | null;
  // Reschedule loop tracking fields
  original_scheduled_at?: string | null;
  original_due_date?: string | null;
  reschedule_count_30d?: number;
  last_rescheduled_at?: string | null;
  reschedule_loop_active?: boolean;
  reschedule_nudge_dismissed_until?: string | null;
  // Custom recurrence fields
  recurrence_interval?: number | null;
  recurrence_unit?: 'days' | 'weeks' | 'months' | null;
  recurrence_end_date?: string | null;
  // Launch/category fields
  category?: string | null;
}

export type FilterTab = 'today' | 'week' | 'future' | 'all' | 'completed';
export type RecurrencePattern = 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
export type DeleteType = 'single' | 'future' | 'all';
export type ViewMode = 'list' | 'kanban' | 'timeline' | 'database' | 'board';
export type EnergyLevel = 'high_focus' | 'medium' | 'low_energy';
export type TaskStatus = 'focus' | 'scheduled' | 'backlog' | 'waiting' | 'someday';

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DURATION_OPTIONS = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
  { value: 240, label: '4h' },
];

export const ENERGY_LEVELS = [
  { value: 'high_focus', label: 'High Focus', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { value: 'medium', label: 'Medium', color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'low_energy', label: 'Low Energy', color: 'text-success', bgColor: 'bg-success/10' },
];

export const CONTEXT_TAGS = [
  { value: 'deep-work', label: 'Deep Work', icon: '🎯' },
  { value: 'admin', label: 'Admin', icon: '📋' },
  { value: 'creative', label: 'Creative', icon: '🎨' },
  { value: 'calls', label: 'Calls', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'research', label: 'Research', icon: '🔍' },
];
