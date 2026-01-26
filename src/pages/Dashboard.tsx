import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, format, parseISO, startOfWeek as getStartOfWeek } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings2, 
  Pencil, 
  TrendingUp, 
  ListTodo, 
  Target, 
  Compass,
  AlertTriangle,
  PartyPopper,
  Flame,
  Calendar,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface WidgetSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  elevated?: boolean;
}

function WidgetSection({ title, icon, children, elevated }: WidgetSectionProps) {
  return (
    <div className={`p-4 md:p-6 ${elevated ? 'bg-muted/30' : 'bg-card'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function getDynamicAlert(currentDay: number) {
  if (currentDay >= 15 && currentDay <= 17) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      message: '"THE GAP" approaching',
      className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    };
  }
  if (currentDay >= 18 && currentDay <= 28) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      message: "YOU'RE IN THE GAP",
      className: 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    };
  }
  if (currentDay === 30) {
    return {
      icon: <Target className="h-4 w-4" />,
      message: '30-day check-in today',
      className: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    };
  }
  if (currentDay === 45) {
    return {
      icon: <PartyPopper className="h-4 w-4" />,
      message: "You're halfway there!",
      className: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
    };
  }
  if (currentDay >= 75) {
    return {
      icon: <Flame className="h-4 w-4" />,
      message: 'Final stretch!',
      className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
    };
  }
  return null;
}

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();

  // Check for weekly plan for current week
  const { data: weeklyPlan, isLoading: weeklyLoading } = useQuery({
    queryKey: ['weekly-plan-check', cycle?.cycle_id],
    queryFn: async () => {
      if (!cycle?.cycle_id) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const today = new Date();
      const weekStart = getStartOfWeek(today, { weekStartsOn: 1 });
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('weekly_plans')
        .select('week_id')
        .eq('user_id', session.user.id)
        .eq('cycle_id', cycle.cycle_id)
        .eq('start_of_week', weekStartStr)
        .maybeSingle();
      
      return data;
    },
    enabled: !!cycle?.cycle_id,
    staleTime: 60 * 1000, // 1 minute
  });

  // Check for daily plan for today
  const { data: dailyPlan, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-plan-check'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('daily_plans')
        .select('day_id')
        .eq('user_id', session.user.id)
        .eq('date', todayStr)
        .maybeSingle();
      
      return data;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const cycleStats = useMemo(() => {
    if (!cycle?.start_date || !cycle?.end_date) return null;

    const start = parseISO(cycle.start_date);
    const end = parseISO(cycle.end_date);
    const today = new Date();

    const totalDays = 90;
    const daysElapsed = Math.max(0, differenceInDays(today, start));
    const currentDay = Math.min(daysElapsed + 1, totalDays);
    const daysRemaining = Math.max(0, totalDays - currentDay + 1);
    const progress = Math.min(100, Math.max(0, (currentDay / totalDays) * 100));
    const currentWeek = Math.ceil(currentDay / 7);
    const totalWeeks = 13;

    return {
      progress: Math.round(progress),
      currentDay,
      daysRemaining,
      currentWeek,
      totalWeeks,
      startFormatted: format(start, 'MMMM d').toUpperCase(),
      endFormatted: format(end, 'MMMM d, yyyy').toUpperCase(),
    };
  }, [cycle]);

  const dynamicAlert = cycleStats ? getDynamicAlert(cycleStats.currentDay) : null;

  // Determine planning status
  const planningLoading = cycleLoading || weeklyLoading || dailyLoading;
  const hasCycle = !!cycle;
  const hasWeeklyPlan = !!weeklyPlan;
  const hasDailyPlan = !!dailyPlan;
  const allComplete = hasCycle && hasWeeklyPlan && hasDailyPlan;

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">Your 90-day planning hub</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: Icon buttons */}
            <Button variant="outline" size="icon" className="md:hidden">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="md:hidden" asChild>
              <Link to="/cycle-setup">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            
            {/* Desktop: Text buttons */}
            <Button variant="outline" className="hidden md:flex">
              <Settings2 className="h-4 w-4 mr-2" />
              Customize Layout
            </Button>
            <Button variant="outline" className="hidden md:flex" asChild>
              <Link to="/cycle-setup">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Plan
              </Link>
            </Button>
          </div>
        </div>

        {/* Widget Container */}
        <Card className="overflow-hidden">
          {/* Quarter Progress - Always visible */}
          <WidgetSection 
            title="Quarter Progress" 
            icon={<TrendingUp className="h-5 w-5" />}
          >
            {cycleLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            )}

            {!cycleLoading && !cycleStats && (
              <div className="text-center py-4">
                <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-2">No active cycle</p>
                <Link to="/cycle-setup" className="text-primary text-sm hover:underline">
                  Start your 90-day cycle →
                </Link>
              </div>
            )}

            {!cycleLoading && cycleStats && (
              <div className="space-y-3">
                {/* Date Range */}
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {cycleStats.startFormatted} - {cycleStats.endFormatted}
                </p>
                
                {/* Progress Bar */}
                <Progress value={cycleStats.progress} className="h-3" />
                
                {/* Day Counter */}
                <p className="text-sm font-medium">
                  Day {cycleStats.currentDay} of 90
                </p>
                
                {/* Stats Line */}
                <p className="text-sm text-muted-foreground">
                  Week {cycleStats.currentWeek} of {cycleStats.totalWeeks} • {cycleStats.daysRemaining} days remaining • {cycleStats.progress}% complete
                </p>
                
                {/* Dynamic Alert */}
                {dynamicAlert && (
                  <Alert className={dynamicAlert.className}>
                    <div className="flex items-center gap-2">
                      {dynamicAlert.icon}
                      <AlertDescription className="font-medium">
                        {dynamicAlert.message}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>
            )}
          </WidgetSection>
          
          <div className="border-t border-border" />
          
          {/* Planning Next Steps - Always visible */}
          <WidgetSection 
            title="Planning Next Steps" 
            icon={<ListTodo className="h-5 w-5" />}
            elevated
          >
            {planningLoading && (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            )}

            {!planningLoading && !hasCycle && (
              <div className="space-y-3">
                <Button asChild className="w-full justify-between">
                  <Link to="/cycle-setup">
                    Plan Your Quarter
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Set your 90-day goal and focus area
                </p>
              </div>
            )}

            {!planningLoading && hasCycle && !hasWeeklyPlan && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Quarter planned</span>
                </div>
                <Button asChild className="w-full justify-between">
                  <Link to="/weekly-plan">
                    Plan This Week
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Set your weekly priorities and focus
                </p>
              </div>
            )}

            {!planningLoading && hasCycle && hasWeeklyPlan && !hasDailyPlan && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Quarter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Week</span>
                  </div>
                </div>
                <Button asChild className="w-full justify-between">
                  <Link to="/daily-plan">
                    Plan Today
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Set your top 3 priorities for today
                </p>
              </div>
            )}

            {!planningLoading && allComplete && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm mb-2">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Quarter</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Week</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Day</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✨ All caught up! Time to execute.
                </p>
              </div>
            )}
          </WidgetSection>
          
          <div className="border-t border-border" />
          
          {/* 90-Day Goal - Default on */}
          <WidgetSection 
            title="90-Day Goal" 
            icon={<Target className="h-5 w-5" />}
          >
            <p className="text-muted-foreground text-sm">Your main goal will appear here</p>
          </WidgetSection>
          
          <div className="border-t border-border" />
          
          {/* Focus Area - Default on */}
          <WidgetSection 
            title="Focus Area" 
            icon={<Compass className="h-5 w-5" />}
            elevated
          >
            <p className="text-muted-foreground text-sm">Your strategic focus will appear here</p>
          </WidgetSection>
        </Card>
      </div>
    </Layout>
  );
}
