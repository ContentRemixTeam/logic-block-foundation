import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Flame,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Route,
  Share2,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { addDays, differenceInDays, eachDayOfInterval, eachWeekOfInterval, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { CycleProgressBanner } from '@/components/cycle/CycleProgressBanner';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PlanningCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TodayTask {
  task_id: string;
  task_text: string;
  is_completed: boolean | null;
  energy_level: string | null;
  priority_order: number | null;
}

interface PlanningStats {
  dailyPlansThisMonth: number;
  totalDaysThisMonth: number;
  weeklyPlansThisMonth: number;
  totalWeeksThisMonth: number;
  currentWeekPriorities: string[];
  currentMonthFocus: string | null;
  todayTasks: TodayTask[];
  openCycleTasks: number;
}

const DEFAULT_STATS: PlanningStats = {
  dailyPlansThisMonth: 0,
  totalDaysThisMonth: 0,
  weeklyPlansThisMonth: 0,
  totalWeeksThisMonth: 0,
  currentWeekPriorities: [],
  currentMonthFocus: null,
  todayTasks: [],
  openCycleTasks: 0,
};

const planningRhythm = [
  {
    label: 'Vision',
    title: 'Know where this is going',
    description: 'Keep the big dream visible so the 90-day goal has a real reason behind it.',
    icon: Sparkles,
  },
  {
    label: 'Focus',
    title: 'Pick one 90-day lane',
    description: 'Choose the business area you are hammering on instead of spreading effort everywhere.',
    icon: Target,
  },
  {
    label: 'Sprints',
    title: 'Move in short deadlines',
    description: 'Break the quarter into smaller pushes so action starts before the plan gets perfect.',
    icon: Flame,
  },
  {
    label: 'Review',
    title: 'Adjust from evidence',
    description: 'Use daily and weekly check-ins to learn, ask for support, and keep going.',
    icon: BarChart3,
  },
];

const quickActions: PlanningCard[] = [
  {
    title: 'Plan today',
    description: 'Pick the One Thing, Top 3, and energy-matched actions for the day.',
    href: '/daily-plan',
    icon: CalendarDays,
  },
  {
    title: 'Plan this week',
    description: 'Choose the weekly priorities that move the 90-day goal forward.',
    href: '/weekly-plan',
    icon: Calendar,
  },
  {
    title: 'Review the week',
    description: 'Capture what worked, what felt sticky, and what needs support.',
    href: '/weekly-review',
    icon: FileText,
  },
  {
    title: 'Ask for support',
    description: 'Turn stuck points into coaching questions and Mastermind discussion.',
    href: '/weekly-reflection',
    icon: MessageSquare,
  },
];

const supportLinks: PlanningCard[] = [
  {
    title: '90-day plan',
    description: 'Edit the goal, focus area, monthly breakdown, and weekly rhythm.',
    href: '/cycle-setup',
    icon: Target,
  },
  {
    title: 'Tasks',
    description: 'See all open actions, including wizard and project tasks.',
    href: '/tasks',
    icon: ListChecks,
  },
  {
    title: 'Projects',
    description: 'Keep bigger work organized without losing the daily next step.',
    href: '/projects',
    icon: Route,
  },
  {
    title: 'Mindset',
    description: 'Work with the thoughts and beliefs underneath the plan.',
    href: '/mindset',
    icon: Brain,
  },
];

const reviewLinks: PlanningCard[] = [
  {
    title: 'Daily review',
    description: 'Notice wins and close the loop on today.',
    href: '/daily-review',
    icon: Sparkles,
  },
  {
    title: 'Weekly reflection',
    description: 'Share wins, lessons, and support requests.',
    href: '/weekly-reflection',
    icon: Share2,
  },
  {
    title: '30-day review',
    description: 'Look at the month from progress, evidence, and capacity.',
    href: '/monthly-review',
    icon: CalendarRange,
  },
  {
    title: '90-day summary',
    description: 'Harvest the cycle and decide what comes next.',
    href: '/cycle-summary',
    icon: CheckCircle2,
  },
];

function normalizePriorities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 3);
}

function getFocusLabel(focusArea?: string | null) {
  if (!focusArea) return 'Choose focus';
  return focusArea.replace(/-/g, ' ');
}

function getEnergyLabel(energyLevel?: string | null) {
  if (!energyLevel) return 'Any energy';
  return energyLevel.replace(/-/g, ' ');
}

export default function Planning() {
  const { user } = useAuth();
  const { data: activeCycle } = useActiveCycle();
  const [stats, setStats] = useState<PlanningStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: now });
      const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: now }, { weekStartsOn: 1 });
      const monthInCycle = activeCycle?.start_date
        ? Math.min(3, Math.max(1, Math.floor(Math.max(0, differenceInDays(now, new Date(activeCycle.start_date))) / 30) + 1))
        : 1;

      try {
        const [
          dailyPlansResult,
          weeklyPlansResult,
          currentWeekResult,
          todayTasksResult,
          monthFocusResult,
          openCycleTasksResult,
        ] = await Promise.all([
          supabase
            .from('daily_plans')
            .select('date')
            .eq('user_id', user.id)
            .gte('date', format(monthStart, 'yyyy-MM-dd'))
            .lte('date', today),
          supabase
            .from('weekly_plans')
            .select('start_of_week')
            .eq('user_id', user.id)
            .gte('start_of_week', format(monthStart, 'yyyy-MM-dd'))
            .lte('start_of_week', format(monthEnd, 'yyyy-MM-dd')),
          supabase
            .from('weekly_plans')
            .select('top_3_priorities')
            .eq('user_id', user.id)
            .eq('start_of_week', format(weekStart, 'yyyy-MM-dd'))
            .maybeSingle(),
          supabase
            .from('tasks')
            .select('task_id, task_text, is_completed, energy_level, priority_order')
            .eq('user_id', user.id)
            .eq('scheduled_date', today)
            .is('deleted_at', null)
            .order('priority_order', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(5),
          activeCycle?.cycle_id
            ? supabase
                .from('cycle_month_plans')
                .select('main_focus')
                .eq('user_id', user.id)
                .eq('cycle_id', activeCycle.cycle_id)
                .eq('month_number', monthInCycle)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          activeCycle?.cycle_id
            ? supabase
                .from('tasks')
                .select('task_id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('cycle_id', activeCycle.cycle_id)
                .eq('is_completed', false)
                .is('deleted_at', null)
            : Promise.resolve({ count: 0, error: null }),
        ]);

        setStats({
          dailyPlansThisMonth: dailyPlansResult.data?.length || 0,
          totalDaysThisMonth: daysInMonth.length,
          weeklyPlansThisMonth: weeklyPlansResult.data?.length || 0,
          totalWeeksThisMonth: weeksInMonth.length,
          currentWeekPriorities: normalizePriorities(currentWeekResult.data?.top_3_priorities),
          currentMonthFocus: monthFocusResult.data?.main_focus || null,
          todayTasks: todayTasksResult.data || [],
          openCycleTasks: openCycleTasksResult.count || 0,
        });
      } catch (error) {
        console.error('Error fetching planning stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeCycle?.cycle_id, activeCycle?.start_date, user]);

  const cycleTiming = useMemo(() => {
    if (!activeCycle?.start_date || !activeCycle?.end_date) return null;

    const start = new Date(activeCycle.start_date);
    const end = new Date(activeCycle.end_date);
    const today = new Date();
    const totalDays = Math.max(1, differenceInDays(end, start));
    const daysElapsed = Math.max(0, differenceInDays(today, start));
    const currentDay = Math.min(totalDays, daysElapsed + 1);
    const sprintNumber = Math.min(9, Math.floor(daysElapsed / 10) + 1);
    const sprintStart = addDays(start, (sprintNumber - 1) * 10);
    const sprintEnd = addDays(sprintStart, 9);

    return {
      currentDay,
      totalDays,
      sprintNumber,
      sprintRange: `${format(sprintStart, 'MMM d')} - ${format(sprintEnd, 'MMM d')}`,
    };
  }, [activeCycle]);

  const dailyPercentage = stats.totalDaysThisMonth > 0
    ? Math.round((stats.dailyPlansThisMonth / stats.totalDaysThisMonth) * 100)
    : 0;

  const weeklyPercentage = stats.totalWeeksThisMonth > 0
    ? Math.round((stats.weeklyPlansThisMonth / stats.totalWeeksThisMonth) * 100)
    : 0;

  const nextMove = useMemo(() => {
    if (!activeCycle) {
      return {
        eyebrow: 'Start here',
        title: 'Create your 90-day focus',
        description: 'Pick one business area to hammer on so the rest of the planner has a clear job.',
        href: '/cycle-setup',
        cta: 'Create 90-day plan',
        icon: Target,
      };
    }

    if (!stats.currentMonthFocus) {
      return {
        eyebrow: 'This month',
        title: 'Choose the next 30-day focus',
        description: 'Turn the 90-day goal into the focus for this part of the cycle.',
        href: `/cycle-setup?edit=${activeCycle.cycle_id}`,
        cta: 'Set monthly focus',
        icon: CalendarRange,
      };
    }

    if (stats.currentWeekPriorities.length === 0) {
      return {
        eyebrow: 'This week',
        title: 'Pick the weekly Top 3',
        description: 'Choose the few actions that make this week count toward the bigger goal.',
        href: '/weekly-plan',
        cta: 'Plan this week',
        icon: Calendar,
      };
    }

    if (stats.todayTasks.length === 0) {
      return {
        eyebrow: 'Today',
        title: "Pick today's Top 3",
        description: 'Choose the actions that move the week forward without overloading your capacity.',
        href: '/daily-plan',
        cta: 'Plan today',
        icon: CalendarDays,
      };
    }

    return {
      eyebrow: 'Execute',
      title: "Work today's plan",
      description: 'Stay in action. Planning counts when it turns into evidence.',
      href: '/daily-plan',
      cta: 'Open today',
      icon: Zap,
    };
  }, [activeCycle, stats.currentMonthFocus, stats.currentWeekPriorities.length, stats.todayTasks.length]);

  const NextMoveIcon = nextMove.icon;

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <Badge variant="outline" className="w-fit gap-1.5 border-primary/20 bg-primary/5 text-primary">
              <Users className="h-3.5 w-3.5" />
              Mastermind planning system
            </Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Low Battery Business Planner Home</h1>
              <p className="mt-2 text-muted-foreground">
                Hold the bigger vision, choose the 90-day focus, then move through monthly, weekly, and daily action.
              </p>
            </div>
          </div>
          <Link
            to={nextMove.href}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {nextMove.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden border-primary/20">
            <div className="border-b bg-primary/5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-fit">{nextMove.eyebrow}</Badge>
                  <div>
                    <h2 className="text-2xl font-semibold">{nextMove.title}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{nextMove.description}</p>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                  <NextMoveIcon className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-border/60 sm:grid-cols-3">
              <div className="bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">90-day focus</p>
                <p className="mt-2 line-clamp-2 font-semibold">
                  {activeCycle?.goal || 'Not created yet'}
                </p>
                <p className="mt-1 text-sm capitalize text-muted-foreground">{getFocusLabel(activeCycle?.focus_area)}</p>
              </div>
              <div className="bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Current sprint</p>
                <p className="mt-2 font-semibold">
                  {cycleTiming ? `Sprint ${cycleTiming.sprintNumber} of 9` : 'Ready to begin'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {cycleTiming ? cycleTiming.sprintRange : 'Create the 90-day plan first'}
                </p>
              </div>
              <div className="bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">This month</p>
                <p className="mt-2 line-clamp-2 font-semibold">
                  {stats.currentMonthFocus || 'No monthly focus yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stats.openCycleTasks} open cycle tasks</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Curriculum checkpoint</h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Do not let planning become procrastination.</p>
                <p className="mt-1 text-sm text-muted-foreground">Pick the best next action from the evidence you have, then learn while moving.</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Line up thoughts, actions, and results.</p>
                <p className="mt-1 text-sm text-muted-foreground">When the action feels heavy, bring the thought or stuck point to coaching.</p>
              </div>
            </div>
          </Card>
        </section>

        <CycleProgressBanner />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {planningRhythm.map((item) => (
            <Card key={item.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{item.label}</Badge>
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">This week</h2>
            </div>
            <div className="mt-4 space-y-3">
              {stats.currentWeekPriorities.length > 0 ? (
                stats.currentWeekPriorities.map((priority, index) => (
                  <div key={`${priority}-${index}`} className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium">{priority}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Pick this week's Top 3 so daily planning has something clear to support.
                </div>
              )}
            </div>
            <Link to="/weekly-plan" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open weekly planner
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Today</h2>
            </div>
            <div className="mt-4 space-y-3">
              {stats.todayTasks.length > 0 ? (
                stats.todayTasks.map((task) => (
                  <div key={task.task_id} className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                    <div className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      task.is_completed ? 'border-success bg-success text-success-foreground' : 'border-muted-foreground/30'
                    )}>
                      {task.is_completed && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', task.is_completed && 'text-muted-foreground line-through')}>
                        {task.task_text}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{getEnergyLabel(task.energy_level)}</Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Choose today's Top 3 from the weekly focus, projects, or task list.
                </div>
              )}
            </div>
            <Link to="/daily-plan" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open daily plan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Daily plans</p>
                <p className="text-xl font-bold">
                  {loading ? '--' : `${stats.dailyPlansThisMonth}/${stats.totalDaysThisMonth}`}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">({dailyPercentage}%)</span>
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Weekly plans</p>
                <p className="text-xl font-bold">
                  {loading ? '--' : `${stats.weeklyPlansThisMonth}/${stats.totalWeeksThisMonth}`}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">({weeklyPercentage}%)</span>
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-waiting/10 text-status-waiting">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Cycle day</p>
                <p className="text-xl font-bold">
                  {cycleTiming ? `${cycleTiming.currentDay}/${cycleTiming.totalDays}` : 'Not set'}
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((card) => (
              <PlannerLinkCard key={card.href} card={card} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Build support</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {supportLinks.map((card) => (
                <PlannerLinkCard key={card.href} card={card} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Review rhythm</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {reviewLinks.map((card) => (
                <PlannerLinkCard key={card.href} card={card} />
              ))}
            </div>
          </div>
        </section>

        <Card className="border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-primary">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Low-energy planning reminder</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  On low-capacity days, the win is not catching up on everything. The win is choosing the smallest useful action that keeps the 90-day goal alive.
                </p>
              </div>
            </div>
            <Link
              to="/tasks?energy=low_energy"
              className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
            >
              See low-energy tasks
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

function PlannerLinkCard({ card }: { card: PlanningCard }) {
  return (
    <Link to={card.href}>
      <Card className="h-full p-4 transition-all hover:border-primary/20 hover:shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <card.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
