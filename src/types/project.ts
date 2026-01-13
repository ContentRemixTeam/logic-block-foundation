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
  board_id: string | null;
  column_id: string | null;
  board_sort_order: number;
  created_at: string;
  updated_at: string;
  task_count?: number;
}

export interface ProjectBoard {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';
export type ProjectColumn = 'todo' | 'in_progress' | 'done';

export interface ProjectSection {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectBoardSettings {
  id: string;
  project_id: string;
  user_id: string;
  visible_columns: string[];
  sort_by: string;
  sort_direction: 'asc' | 'desc';
  created_at: string;
  updated_at: string;
}

export const SECTION_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
];

export const BOARD_COLUMNS = [
  { id: 'task', label: 'Task', required: true, width: 300 },
  { id: 'status', label: 'Status', required: true, width: 130 },
  { id: 'scheduled_date', label: 'Due Date', required: false, width: 130 },
  { id: 'tags', label: 'Tags', required: false, width: 150 },
  { id: 'priority', label: 'Priority', required: false, width: 100 },
  { id: 'energy_level', label: 'Energy', required: false, width: 100 },
  { id: 'estimated_minutes', label: 'Estimate', required: false, width: 80 },
  { id: 'project', label: 'Project', required: false, width: 150 },
  { id: 'sop', label: 'SOP', required: false, width: 150 },
  { id: 'notes', label: 'Notes', required: false, width: 60 },
];

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

export const COLUMN_COLORS = [
  '#94A3B8', // Gray
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#10B981', // Green
  '#059669', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
];

export const PROJECT_COLUMN_CONFIG = [
  { value: 'todo' as const, label: 'To Do', icon: '📋' },
  { value: 'in_progress' as const, label: 'In Progress', icon: '🔄' },
  { value: 'done' as const, label: 'Done', icon: '✅' },
];

export const BOARD_TEMPLATES = [
  {
    name: 'Simple Workflow',
    columns: [
      { name: 'To Do', color: '#94A3B8' },
      { name: 'Doing', color: '#F59E0B' },
      { name: 'Done', color: '#10B981' },
    ],
  },
  {
    name: 'Marketing Campaign',
    columns: [
      { name: 'Brainstorm', color: '#8B5CF6' },
      { name: 'Planning', color: '#3B82F6' },
      { name: 'Creating', color: '#F59E0B' },
      { name: 'Publishing', color: '#10B981' },
      { name: 'Analyzing', color: '#06B6D4' },
    ],
  },
  {
    name: 'Development Sprint',
    columns: [
      { name: 'Backlog', color: '#94A3B8' },
      { name: 'To Do', color: '#3B82F6' },
      { name: 'In Progress', color: '#F59E0B' },
      { name: 'Review', color: '#8B5CF6' },
      { name: 'Done', color: '#10B981' },
    ],
  },
  {
    name: 'Content Calendar',
    columns: [
      { name: 'Ideas', color: '#8B5CF6' },
      { name: 'Drafting', color: '#F59E0B' },
      { name: 'Editing', color: '#3B82F6' },
      { name: 'Scheduled', color: '#06B6D4' },
      { name: 'Published', color: '#10B981' },
    ],
  },
];
