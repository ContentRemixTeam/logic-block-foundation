import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, Target, AlertTriangle, DollarSign, Compass, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function CEOWeeklyView() {
  const { user } = useAuth();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = ymd(weekStart);
  const weekEndStr = ymd(weekEnd);
  const todayStr = ymd(today);

  const { data, isLoading } = useQuery({
    queryKey: ['ceo-weekly', user?.id, weekStartStr],
    enabled: !!user?.id,
    queryFn: async () => {
      const [winsRes, completedRes, overdueRes, stuckRes, focusRes, weeklyPlanRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('task_id, task_text, completed_at')
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .eq('is_completed', true)
          .gte('completed_at', `${weekStartStr}T00:00:00`)
          .lte('completed_at', `${weekEndStr}T23:59:59`)
          .order('completed_at', { ascending: false })
          .limit(20),
        supabase
          .from('tasks')
          .select('task_id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .eq('is_completed', true)
          .gte('completed_at', `${weekStartStr}T00:00:00`)
          .lte('completed_at', `${weekEndStr}T23:59:59`),
        supabase
          .from('tasks')
          .select('task_id, task_text, scheduled_date')
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .eq('is_completed', false)
          .lt('scheduled_date', todayStr)
          .order('scheduled_date', { ascending: true })
          .limit(10),
        supabase
          .from('tasks')
          .select('task_id, task_text, status')
          .eq('user_id', user!.id)
          .is('deleted_at', null)
          .eq('status', 'waiting')
          .eq('is_completed', false)
          .limit(10),
        supabase
          .from('daily_plans')
          .select('top_3_today, thought, feeling')
          .eq('user_id', user!.id)
          .eq('date', todayStr)
          .maybeSingle(),
        supabase
          .from('weekly_plans')
          .select('top_3_priorities, weekly_thought')
          .eq('user_id', user!.id)
          .lte('start_of_week', todayStr)
          .gte('start_of_week', ymd(subDays(weekStart, 1)))
          .order('start_of_week', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        wins: winsRes.data || [],
        completedCount: completedRes.count || 0,
        overdue: overdueRes.data || [],
        stuck: stuckRes.data || [],
        dailyPlan: focusRes.data,
        weeklyPlan: weeklyPlanRes.data,
      };
    },
  });

  const top3Today = useMemo(() => {
    const t = data?.dailyPlan?.top_3_today;
    if (Array.isArray(t)) return t.slice(0, 3);
    return [];
  }, [data]);

  const weeklyTop3 = useMemo(() => {
    const t = data?.weeklyPlan?.top_3_priorities;
    if (Array.isArray(t)) return t.slice(0, 3);
    return [];
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" /><Skeleton className="h-48" />
        <Skeleton className="h-48" /><Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Wins */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" /> What's working
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{data?.completedCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">tasks completed this week</div>
            {(data?.wins?.length ?? 0) > 0 ? (
              <ul className="text-sm space-y-1 mt-2">
                {data!.wins.slice(0, 5).map((w: any) => (
                  <li key={w.task_id} className="line-clamp-1">✓ {w.task_text}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No completed tasks logged yet this week.</p>
            )}
            <Button variant="ghost" size="sm" asChild className="mt-2 -ml-3">
              <Link to="/wins">View all wins <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* 2. Top priorities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" /> Top priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Today</div>
              {top3Today.length > 0 ? (
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  {top3Today.map((t: any, i: number) => (
                    <li key={i} className="line-clamp-1">{typeof t === 'string' ? t : t?.text || t?.task || '—'}</li>
                  ))}
                </ol>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/daily-plan">Set top 3 for today</Link>
                </Button>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">This week</div>
              {weeklyTop3.length > 0 ? (
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  {weeklyTop3.map((t: any, i: number) => (
                    <li key={i} className="line-clamp-1">{typeof t === 'string' ? t : t?.text || t?.task || '—'}</li>
                  ))}
                </ol>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/weekly-plan">Plan the week</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Stuck / overdue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Where you're stuck
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold">{data?.overdue?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground">overdue</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{data?.stuck?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground">waiting on</div>
              </div>
            </div>
            {(data?.overdue?.length ?? 0) > 0 && (
              <ul className="text-sm space-y-1">
                {data!.overdue.slice(0, 3).map((t: any) => (
                  <li key={t.task_id} className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1">{t.task_text}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{t.scheduled_date}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/open-loops">Open loops <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* 4. Revenue / focus */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="h-4 w-4 text-emerald-500" /> One thing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you only moved one thing forward this week, what would it be?
            </p>
            {data?.dailyPlan?.thought ? (
              <p className="text-sm italic">"{data.dailyPlan.thought}"</p>
            ) : data?.weeklyPlan?.weekly_thought ? (
              <p className="text-sm italic">"{data.weeklyPlan.weekly_thought}"</p>
            ) : (
              <p className="text-xs text-muted-foreground">Capture this in your weekly plan.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" asChild>
                <Link to="/offers"><DollarSign className="h-3.5 w-3.5 mr-1" /> Offers</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/financial-tracker">Revenue</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/weekly-plan">Plan week</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
