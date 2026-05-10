import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { differenceInCalendarDays, startOfWeek, endOfWeek, subWeeks, parseISO, format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Target, Crown, FolderKanban } from 'lucide-react';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useTasks } from '@/hooks/useTasks';

interface MinimalTask {
  is_completed?: boolean | null;
  completed_at?: string | null;
  scheduled_date?: string | null;
  project_id?: string | null;
}

/**
 * CEO Snapshot — read-only weekly metrics summary.
 * Shows business "season" (week N of cycle), tasks completed this week vs last,
 * and top project by completed tasks.
 */
export function CEOSnapshot() {
  const { data: cycle } = useActiveCycle();
  const { tasks: allTasks } = useTasks({ loadAll: true });

  const stats = useMemo(() => {
    const now = new Date();
    const thisStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const inRange = (iso: string | null | undefined, start: Date, end: Date) => {
      if (!iso) return false;
      try {
        const d = parseISO(iso);
        return d >= start && d <= end;
      } catch {
        return false;
      }
    };

    const tasks: MinimalTask[] = (allTasks ?? []) as MinimalTask[];
    const completedThis = tasks.filter(t => t.is_completed && inRange(t.completed_at, thisStart, thisEnd));
    const completedLast = tasks.filter(t => t.is_completed && inRange(t.completed_at, lastStart, lastEnd));

    const projectCounts = new Map<string, number>();
    completedThis.forEach(t => {
      if (t.project_id) projectCounts.set(t.project_id, (projectCounts.get(t.project_id) ?? 0) + 1);
    });
    let topProjectId: string | null = null;
    let topProjectCount = 0;
    projectCounts.forEach((count, id) => {
      if (count > topProjectCount) {
        topProjectCount = count;
        topProjectId = id;
      }
    });

    const delta = completedThis.length - completedLast.length;

    // Cycle/season position
    let weekOfCycle: number | null = null;
    let totalWeeks: number | null = null;
    let phaseLabel: string | null = null;
    if (cycle?.start_date && cycle?.end_date) {
      try {
        const start = parseISO(cycle.start_date);
        const end = parseISO(cycle.end_date);
        const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
        const dayInto = Math.max(0, differenceInCalendarDays(now, start));
        totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
        weekOfCycle = Math.min(totalWeeks, Math.floor(dayInto / 7) + 1);
        const third = totalWeeks / 3;
        if (weekOfCycle <= third) phaseLabel = 'Build phase';
        else if (weekOfCycle <= third * 2) phaseLabel = 'Push phase';
        else phaseLabel = 'Land phase';
      } catch { /* noop */ }
    }

    return {
      completedThis: completedThis.length,
      completedLast: completedLast.length,
      delta,
      topProjectId,
      topProjectCount,
      weekOfCycle,
      totalWeeks,
      phaseLabel,
      thisLabel: `${format(thisStart, 'MMM d')} – ${format(thisEnd, 'MMM d')}`,
    };
  }, [allTasks, cycle]);

  const TrendIcon = stats.delta > 0 ? TrendingUp : stats.delta < 0 ? TrendingDown : Minus;
  const trendTone = stats.delta > 0 ? 'text-success' : stats.delta < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-card to-muted/20">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">CEO Snapshot</h2>
              <p className="text-[11px] text-muted-foreground">{stats.thisLabel}</p>
            </div>
          </div>

          {stats.phaseLabel && stats.weekOfCycle && stats.totalWeeks && (
            <Badge variant="secondary" className="gap-1.5">
              <Target className="h-3 w-3" />
              {stats.phaseLabel} · Week {stats.weekOfCycle}/{stats.totalWeeks}
            </Badge>
          )}
        </div>

        {/* Season progress */}
        {stats.weekOfCycle && stats.totalWeeks && (
          <Progress value={(stats.weekOfCycle / stats.totalWeeks) * 100} className="h-1.5" />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat
            label="Tasks done this week"
            value={stats.completedThis}
            sub={
              <span className={`flex items-center gap-0.5 ${trendTone}`}>
                <TrendIcon className="h-3 w-3" />
                {stats.delta > 0 ? `+${stats.delta}` : stats.delta} vs last
              </span>
            }
          />
          <Stat label="Last week" value={stats.completedLast} sub={<span>completed</span>} />
          {stats.topProjectId ? (
            <Stat
              label="Top project"
              value={
                <Link
                  to={`/projects/${stats.topProjectId}`}
                  className="text-base font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  View
                </Link>
              }
              sub={<span>{stats.topProjectCount} done</span>}
            />
          ) : (
            <Stat label="Top project" value="—" sub={<span>no completions</span>} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
