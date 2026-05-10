import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface ProjectStats {
  total: number;
  completed: number;
  overdue: number;
  pct: number;
  nextActionTitle: string | null;
  nextActionDate: string | null;
  lastTouched: string | null; // ISO
}

interface MinimalTask {
  task_id?: string;
  title?: string | null;
  project_id?: string | null;
  scheduled_date?: string | null;
  is_completed?: boolean | null;
  completed_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
}

/**
 * Pure helper: derive at-a-glance project stats from a tasks array.
 * No queries, no side effects — safe to call inside render.
 */
export function computeProjectStats(
  projectId: string,
  allTasks: MinimalTask[],
): ProjectStats {
  const tasks = allTasks.filter(t => t.project_id === projectId);
  const total = tasks.length;
  const completed = tasks.filter(t => t.is_completed).length;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const overdue = tasks.filter(t => {
    if (t.is_completed) return false;
    if (!t.scheduled_date) return false;
    return t.scheduled_date < todayStr;
  }).length;

  // Next action: first non-completed by scheduled_date asc; nulls last
  const upcoming = tasks
    .filter(t => !t.is_completed)
    .sort((a, b) => {
      const ad = a.scheduled_date || '9999-12-31';
      const bd = b.scheduled_date || '9999-12-31';
      return ad.localeCompare(bd);
    });
  const next = upcoming[0];

  // Last touched: max(updated_at, completed_at) across project tasks
  let lastTouched: string | null = null;
  for (const t of tasks) {
    const candidate = t.completed_at || t.updated_at || null;
    if (candidate && (!lastTouched || candidate > lastTouched)) {
      lastTouched = candidate;
    }
  }

  return {
    total,
    completed,
    overdue,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    nextActionTitle: next?.title ?? null,
    nextActionDate: next?.scheduled_date ?? null,
    lastTouched,
  };
}

/** Friendly "2d ago" / "today" / "in 3d" label. */
export function formatRelativeDays(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = typeof iso === 'string' && iso.length === 10 ? parseISO(iso) : new Date(iso);
    const diff = differenceInCalendarDays(d, new Date());
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    if (diff === -1) return 'yesterday';
    if (diff > 0) return `in ${diff}d`;
    return `${Math.abs(diff)}d ago`;
  } catch {
    return null;
  }
}
