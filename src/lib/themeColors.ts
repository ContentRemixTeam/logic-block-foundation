/**
 * Theme-aware color utility helpers
 * 
 * These functions return Tailwind classes that use CSS variables,
 * so colors automatically adapt to the current theme.
 */

export type TaskStatus = 'focus' | 'scheduled' | 'backlog' | 'waiting' | 'someday';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'content' | 'nurture' | 'offer';

/**
 * Get theme-aware color classes for task status
 */
export function getStatusColor(status: string | null | undefined): string {
  const colors: Record<string, string> = {
    focus: 'bg-status-focus/10 text-status-focus border-status-focus/20',
    scheduled: 'bg-status-scheduled/10 text-status-scheduled border-status-scheduled/20',
    backlog: 'bg-status-backlog/10 text-status-backlog border-status-backlog/20',
    waiting: 'bg-status-waiting/10 text-status-waiting border-status-waiting/20',
    someday: 'bg-status-someday/10 text-status-someday border-status-someday/20',
  };
  return colors[status || 'backlog'] || colors.backlog;
}

/**
 * Get theme-aware color classes for priority
 */
export function getPriorityColor(priority: string | null | undefined): string {
  const colors: Record<string, string> = {
    high: 'bg-priority-high/10 text-priority-high border-priority-high/20',
    medium: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
    low: 'bg-priority-low/10 text-priority-low border-priority-low/20',
    asap: 'bg-priority-high/10 text-priority-high border-priority-high/20',
    next_week: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
    next_month: 'bg-status-scheduled/10 text-status-scheduled border-status-scheduled/20',
  };
  return colors[priority || ''] || '';
}

/**
 * Get theme-aware color classes for categories
 */
export function getCategoryColor(category: string | null | undefined): string {
  const colors: Record<string, string> = {
    content: 'bg-category-content/10 text-category-content border-category-content/20',
    nurture: 'bg-category-nurture/10 text-category-nurture border-category-nurture/20',
    offer: 'bg-category-offer/10 text-category-offer border-category-offer/20',
  };
  return colors[category || ''] || '';
}

/**
 * Get badge-style classes for status
 */
export function getStatusBadgeClasses(status: string | null | undefined): string {
  const classes: Record<string, string> = {
    focus: 'bg-status-focus/10 text-status-focus dark:bg-status-focus/20',
    scheduled: 'bg-status-scheduled/10 text-status-scheduled dark:bg-status-scheduled/20',
    backlog: 'bg-status-backlog/10 text-status-backlog dark:bg-status-backlog/20',
    waiting: 'bg-status-waiting/10 text-status-waiting dark:bg-status-waiting/20',
    someday: 'bg-status-someday/10 text-status-someday dark:bg-status-someday/20',
  };
  return classes[status || 'backlog'] || classes.backlog;
}

/**
 * Get badge-style classes for priority
 */
export function getPriorityBadgeClasses(priority: string | null | undefined): string {
  const classes: Record<string, string> = {
    high: 'bg-priority-high/10 text-priority-high dark:bg-priority-high/20',
    medium: 'bg-priority-medium/10 text-priority-medium dark:bg-priority-medium/20',
    low: 'bg-priority-low/10 text-priority-low dark:bg-priority-low/20',
  };
  return classes[priority || ''] || '';
}

/**
 * Get hex color for dynamic styling (e.g., charts, borders)
 * Note: These return CSS variable references for inline styles
 */
export function getStatusCssVar(status: string): string {
  return `hsl(var(--status-${status}))`;
}

export function getPriorityCssVar(priority: string): string {
  return `hsl(var(--priority-${priority}))`;
}

export function getCategoryCssVar(category: string): string {
  return `hsl(var(--category-${category}))`;
}
