import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, startOfWeek, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { MOMENTUM_BY_VALUE, MOMENTUM_TYPES, type MomentumType } from '@/lib/momentumTypes';
import {
  Target, Calendar, Sparkles, FolderKanban, Trophy, AlertTriangle,
  ArrowRight, Compass, Flame,
} from 'lucide-react';

interface ProjectRow { id: string; name: string; status: string }
interface WeekRow {
  week_id: string;
  start_of_week: string;
  weekly_outcome: string | null;
  minimum_viable_week: unknown;
  life_happens_plan: string | null;
  top_3_priorities: unknown;
}
interface TaskAggRow {
  task_id: string;
  task_text: string;
  status: string;
  momentum_type: MomentumType | null;
  reschedule_count_30d: number | null;
  scheduled_date: string | null;
  cycle_id: string | null;
  completed_at: string | null;
}
interface EvidenceRow { id: string; content: string; entry_date: string; category: string | null }

export function CycleCommandCenter() {
  const { user } = useAuth();
  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();

  const cycleId = cycle?.cycle_id;
  const startISO = cycle?.start_date;

  const { data, isLoading } = useQuery({
    queryKey: ['cycle-command-center', cycleId],
    enabled: !!user && !!cycleId,
    staleTime: 60_000,
    queryFn: async () => {
      const today = new Date();
      const wkStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const [projectsRes, weekRes, tasksRes, evidenceRes] = await Promise.all([
        supabase.from('projects')
          .select('id, name, status')
          .eq('user_id', user!.id)
          .eq('cycle_id', cycleId!)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase.from('weekly_plans')
          .select('week_id, start_of_week, weekly_outcome, minimum_viable_week, life_happens_plan, top_3_priorities')
          .eq('user_id', user!.id)
          .eq('cycle_id', cycleId!)
          .lte('start_of_week', wkStart)
          .order('start_of_week', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('tasks')
          .select('task_id, task_text, status, momentum_type, reschedule_count_30d, scheduled_date, cycle_id, completed_at')
          .eq('user_id', user!.id)
          .eq('cycle_id', cycleId!)
          .order('updated_at', { ascending: false })
          .limit(500),
        supabase.from('evidence_bank')
          .select('id, content, entry_date, category')
          .eq('user_id', user!.id)
          .gte('entry_date', startISO!)
          .order('entry_date', { ascending: false })
          .limit(5),
      ]);

      return {
        projects: (projectsRes.data ?? []) as ProjectRow[],
        week: (weekRes.data ?? null) as WeekRow | null,
        tasks: (tasksRes.data ?? []) as TaskAggRow[],
        evidence: (evidenceRes.data ?? []) as EvidenceRow[],
      };
    },
  });

  const stats = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const done = tasks.filter(t => t.status === 'done');
    const open = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const stuck = open
      .filter(t => (t.reschedule_count_30d ?? 0) >= 3)
      .slice(0, 5);
    const unconnected = open.filter(t => !t.momentum_type).length;

    const byMomentum: Record<string, number> = {};
    for (const t of done) {
      const k = t.momentum_type ?? 'unset';
      byMomentum[k] = (byMomentum[k] ?? 0) + 1;
    }
    const totalMomentumTagged = Object.entries(byMomentum)
      .filter(([k]) => k !== 'unset')
      .reduce((a, [, v]) => a + v, 0);

    return {
      doneCount: done.length,
      openCount: open.length,
      stuck,
      unconnected,
      byMomentum,
      totalMomentumTagged,
    };
  }, [data?.tasks]);

  if (cycleLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (!cycle) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <Compass className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No active 90-day cycle</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Set your goal, identity, and focus area to unlock the Command Center.
          </p>
          <Button asChild>
            <Link to="/cycle-setup">Start a cycle</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const start = new Date(cycle.start_date);
  const end = new Date(cycle.end_date);
  const today = new Date();
  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const elapsed = Math.min(totalDays, Math.max(0, differenceInCalendarDays(today, start)));
  const daysRemaining = Math.max(0, differenceInCalendarDays(end, today));
  const pct = Math.round((elapsed / totalDays) * 100);
  const monthNumber = Math.min(3, Math.floor(elapsed / 30) + 1);

  const week = data?.week;
  const mvw = Array.isArray(week?.minimum_viable_week)
    ? (week!.minimum_viable_week as unknown[]).filter(Boolean).map(String)
    : [];
  const top3 = Array.isArray(week?.top_3_priorities)
    ? (week!.top_3_priorities as unknown[]).filter(Boolean).map(String)
    : [];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                <Target className="h-3.5 w-3.5" /> 90-day goal · Month {monthNumber} of 3
              </div>
              <h2 className="text-2xl font-bold leading-tight">{cycle.goal}</h2>
              {cycle.identity && (
                <p className="text-sm text-muted-foreground italic">"{cycle.identity}"</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(start, 'MMM d')} → {format(end, 'MMM d, yyyy')}
                {cycle.focus_area && (
                  <Badge variant="outline" className="ml-1 capitalize">{cycle.focus_area}</Badge>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-bold tabular-nums">{daysRemaining}</div>
              <div className="text-xs text-muted-foreground">days remaining</div>
              <Button asChild variant="ghost" size="sm" className="mt-2 -mr-2">
                <Link to={`/cycle-view/${cycle.cycle_id}`}>Full plan <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </div>
          <div>
            <Progress value={pct} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>Day {elapsed} of {totalDays}</span>
              <span>{pct}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* This week */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-primary" /> This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : week ? (
              <>
                {week.weekly_outcome && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Outcome</div>
                    <p className="text-sm font-medium">{week.weekly_outcome}</p>
                  </div>
                )}
                {mvw.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Minimum viable week</div>
                    <ul className="space-y-1">
                      {mvw.slice(0, 3).map((c, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!week.weekly_outcome && mvw.length === 0 && top3.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Priorities</div>
                    <ul className="space-y-1">
                      {top3.slice(0, 3).map((c, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!week.weekly_outcome && mvw.length === 0 && top3.length === 0 && (
                  <p className="text-sm text-muted-foreground">No commitments set this week.</p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link to="/weekly-plan">Open weekly plan</Link>
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 space-y-2">
                <p>No weekly plan for this week yet.</p>
                <Button asChild size="sm"><Link to="/weekly-plan">Plan this week</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Momentum mix */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Momentum This Cycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : stats.doneCount === 0 ? (
              <p className="text-sm text-muted-foreground">No completed tasks yet this cycle.</p>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  <span className="text-foreground font-semibold">{stats.doneCount}</span> tasks completed ·{' '}
                  <span className="text-foreground font-semibold">{stats.openCount}</span> open
                </div>
                <div className="space-y-2">
                  {(Object.keys(MOMENTUM_META) as MomentumType[]).map((m) => {
                    const count = stats.byMomentum[m] ?? 0;
                    const total = stats.totalMomentumTagged || 1;
                    const meta = MOMENTUM_META[m];
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={m}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5">
                            <span>{meta.emoji}</span>
                            <span className="text-foreground">{meta.label}</span>
                          </span>
                          <span className="text-muted-foreground tabular-nums">{count} · {pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1" />
                      </div>
                    );
                  })}
                </div>
                {stats.unconnected > 0 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    {stats.unconnected} open task{stats.unconnected === 1 ? '' : 's'} not yet tagged with a momentum type.{' '}
                    <Link to="/tasks" className="text-primary hover:underline">Connect them →</Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Active projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4 text-primary" /> Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : data?.projects.length ? (
              <ul className="space-y-1.5">
                {data.projects.slice(0, 6).map(p => (
                  <li key={p.id}>
                    <Link
                      to={`/projects?project=${p.id}`}
                      className="block text-sm px-3 py-2 rounded-md hover:bg-muted/60 transition-colors"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 space-y-2">
                <p>No projects linked to this cycle yet.</p>
                <Button asChild size="sm" variant="outline"><Link to="/projects">Add a project</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent wins */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" /> Recent Wins & Evidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : data?.evidence.length ? (
              <ul className="space-y-2">
                {data.evidence.slice(0, 5).map(e => (
                  <li key={e.id} className="text-sm border-l-2 border-primary/40 pl-3">
                    <p className="line-clamp-2">{e.content}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(e.entry_date), 'MMM d')}
                      {e.category && ` · ${e.category}`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 space-y-2">
                <p>No wins logged yet this cycle.</p>
                <Button asChild size="sm" variant="outline"><Link to="/evidence">Open Evidence Bank</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stuck */}
      {stats.stuck.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> What's Stuck ({stats.stuck.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These have been rescheduled 3+ times in the last 30 days. Use "Make this easier" to break them down.
            </p>
            <ul className="space-y-1.5">
              {stats.stuck.map(t => (
                <li key={t.task_id}>
                  <Link
                    to="/tasks"
                    className="block text-sm px-3 py-2 rounded-md hover:bg-background/80 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{t.task_text}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {t.reschedule_count_30d}× moved
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
