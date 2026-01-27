import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, format, parseISO, startOfWeek as getStartOfWeek, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useActiveLaunches } from '@/hooks/useActiveLaunches';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  ChevronRight,
  RefreshCw,
  BarChart3,
  Rocket,
  Clock,
  Zap,
  FileText,
  Plus,
  CalendarIcon,
  Circle,
  Sparkles
} from 'lucide-react';
import { SalesGoalTrackerWidget } from '@/components/dashboard/SalesGoalTrackerWidget';
import { HabitTrackerWidget } from '@/components/dashboard/HabitTrackerWidget';
import { QuickWinsWidget } from '@/components/dashboard/QuickWinsWidget';
import { PodcastWidget } from '@/components/podcast/PodcastWidget';
import { MastermindCallWidget } from '@/components/mastermind/MastermindCallWidget';

function getDynamicAlert(currentDay: number) {
  if (currentDay >= 15 && currentDay <= 17) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      message: '"THE GAP" approaching',
      subtext: 'Energy dips are normal. Push through!',
      className: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    };
  }
  if (currentDay >= 18 && currentDay <= 28) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      message: "YOU'RE IN THE GAP",
      subtext: 'This is where most people quit. Not you.',
      className: 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    };
  }
  if (currentDay === 30) {
    return {
      icon: <Target className="h-4 w-4" />,
      message: '30-day check-in today',
      subtext: 'Time to assess and adjust your strategy.',
      className: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    };
  }
  if (currentDay === 45) {
    return {
      icon: <PartyPopper className="h-4 w-4" />,
      message: "You're halfway there!",
      subtext: 'Keep the momentum going!',
      className: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
    };
  }
  if (currentDay >= 75) {
    return {
      icon: <Flame className="h-4 w-4" />,
      message: 'Final stretch!',
      subtext: 'Strong finish ahead!',
      className: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
    };
  }
  return null;
}

function getScoreColor(score: number) {
  if (score <= 3) return 'text-red-500';
  if (score <= 6) return 'text-yellow-500';
  return 'text-green-500';
}

function getProgressBarGradient(score: number) {
  if (score <= 3) return 'from-red-400 to-red-600';
  if (score <= 6) return 'from-yellow-400 to-yellow-600';
  return 'from-green-400 to-green-600';
}

// Launch state type
type LaunchState = 'none' | 'far' | 'approaching' | 'imminent' | 'live' | 'closed';

function getLaunchState(daysUntilOpen: number, isLive: boolean, phase: string): LaunchState {
  if (phase === 'closed') return 'closed';
  if (isLive) return 'live';
  if (daysUntilOpen <= 0) return 'live';
  if (daysUntilOpen <= 6) return 'imminent';
  if (daysUntilOpen <= 29) return 'approaching';
  return 'far';
}

// Widget Card wrapper component with gradient header
interface WidgetCardProps {
  title: string;
  icon: React.ReactNode;
  gradientClass?: string;
  children: React.ReactNode;
  className?: string;
}

function WidgetCard({ title, icon, gradientClass = 'from-primary/5', children, className }: WidgetCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300 hover:border-primary/20",
      className
    )}>
      <CardHeader className={cn("bg-gradient-to-r to-transparent pb-3", gradientClass)}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}

// Stat card component
interface StatCardProps {
  value: string | number;
  label: string;
  highlight?: boolean;
}

function StatCard({ value, label, highlight }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
      <div className={cn("text-2xl font-bold", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();
  const { data: launches = [], isLoading: launchesLoading } = useActiveLaunches();
  
  // Get the next upcoming launch (first one since they're ordered by cart_opens)
  const nextLaunch = launches[0] || null;
  
  // Dialog state for retake diagnostic
  const [dialogOpen, setDialogOpen] = useState(false);
  const [discoverScore, setDiscoverScore] = useState(5);
  const [nurtureScore, setNurtureScore] = useState(5);
  const [convertScore, setConvertScore] = useState(5);

  // Fetch diagnostic scores
  const { data: diagnosticData, isLoading: diagnosticLoading } = useQuery({
    queryKey: ['diagnostic-scores', cycle?.cycle_id],
    queryFn: async () => {
      if (!cycle?.cycle_id) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const { data } = await supabase
        .from('cycles_90_day')
        .select('discover_score, nurture_score, convert_score, focus_area, updated_at')
        .eq('cycle_id', cycle.cycle_id)
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      return data;
    },
    enabled: !!cycle?.cycle_id,
    staleTime: 60 * 1000,
  });

  // Mutation to update diagnostic scores
  const updateDiagnostic = useMutation({
    mutationFn: async (scores: { discover: number; nurture: number; convert: number }) => {
      if (!cycle?.cycle_id) throw new Error('No active cycle');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      // Calculate focus area (lowest score)
      const lowestScore = Math.min(scores.discover, scores.nurture, scores.convert);
      let focusArea = 'discover';
      if (scores.nurture === lowestScore) focusArea = 'nurture';
      else if (scores.convert === lowestScore) focusArea = 'convert';
      
      const { error } = await supabase
        .from('cycles_90_day')
        .update({
          discover_score: scores.discover,
          nurture_score: scores.nurture,
          convert_score: scores.convert,
          focus_area: focusArea,
          updated_at: new Date().toISOString(),
        })
        .eq('cycle_id', cycle.cycle_id)
        .eq('user_id', session.user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-scores'] });
      queryClient.invalidateQueries({ queryKey: ['active-cycle'] });
      toast.success('Diagnostic scores updated');
      setDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to update scores');
    },
  });

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
    staleTime: 60 * 1000,
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
    staleTime: 60 * 1000,
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

  // Calculate diagnostic display data
  const diagnosticDisplay = useMemo(() => {
    if (!diagnosticData || !cycle?.start_date) return null;

    const discover = diagnosticData.discover_score ?? 0;
    const nurture = diagnosticData.nurture_score ?? 0;
    const convert = diagnosticData.convert_score ?? 0;
    
    // Determine focus area (lowest score)
    const lowestScore = Math.min(discover, nurture, convert);
    let focusArea = diagnosticData.focus_area || 'discover';
    if (!diagnosticData.focus_area) {
      if (nurture === lowestScore) focusArea = 'nurture';
      else if (convert === lowestScore) focusArea = 'convert';
    }

    // Calculate days since last update
    const updatedAt = diagnosticData.updated_at 
      ? parseISO(diagnosticData.updated_at) 
      : parseISO(cycle.start_date);
    const daysSinceUpdate = differenceInDays(new Date(), updatedAt);
    const needsRetake = daysSinceUpdate > 30;

    // Calculate week and day of update
    const start = parseISO(cycle.start_date);
    const dayOfCycle = Math.max(1, differenceInDays(updatedAt, start) + 1);
    const weekOfCycle = Math.ceil(dayOfCycle / 7);

    return {
      discover,
      nurture,
      convert,
      focusArea,
      daysSinceUpdate,
      needsRetake,
      weekOfCycle,
      dayOfCycle,
    };
  }, [diagnosticData, cycle]);

  // Calculate launch display data
  const launchDisplay = useMemo(() => {
    if (!nextLaunch) return null;
    
    const launchState = getLaunchState(nextLaunch.daysUntilOpen, nextLaunch.isLive, nextLaunch.phase);
    const cartOpens = parseISO(nextLaunch.cart_opens);
    const cartCloses = parseISO(nextLaunch.cart_closes);
    
    return {
      ...nextLaunch,
      launchState,
      cartOpensFormatted: format(cartOpens, 'MMM d'),
      cartClosesFormatted: format(cartCloses, 'MMM d'),
    };
  }, [nextLaunch]);

  // Initialize slider values when dialog opens
  const handleDialogOpen = (open: boolean) => {
    if (open && diagnosticData) {
      setDiscoverScore(diagnosticData.discover_score ?? 5);
      setNurtureScore(diagnosticData.nurture_score ?? 5);
      setConvertScore(diagnosticData.convert_score ?? 5);
    }
    setDialogOpen(open);
  };

  const dynamicAlert = cycleStats ? getDynamicAlert(cycleStats.currentDay) : null;

  // Determine planning status
  const planningLoading = cycleLoading || weeklyLoading || dailyLoading;
  const hasCycle = !!cycle;
  const hasWeeklyPlan = !!weeklyPlan;
  const hasDailyPlan = !!dailyPlan;
  const allComplete = hasCycle && hasWeeklyPlan && hasDailyPlan;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Your 90-day planning command center
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 hover:bg-muted/50">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Customize</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 hover:bg-muted/50 group" asChild>
              <Link to="/cycle-setup">
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit Plan</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - spans 2 cols on desktop */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quarter Progress */}
            <WidgetCard
              title="Quarter Progress"
              icon={<TrendingUp className="h-5 w-5 text-primary" />}
              gradientClass="from-blue-500/5"
            >
              {cycleLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}

              {!cycleLoading && !cycleStats && (
                <div className="text-center py-8 px-4">
                  <div className="relative mb-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-primary/60" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-6 w-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-yellow-900" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No active cycle</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Start your 90-day journey to achieve your biggest goals
                  </p>
                  <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" asChild>
                    <Link to="/cycle-setup">
                      <Rocket className="h-4 w-4" />
                      Start Your 90-Day Cycle
                    </Link>
                  </Button>
                </div>
              )}

              {!cycleLoading && cycleStats && (
                <div className="space-y-4">
                  {/* Date Range */}
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {cycleStats.startFormatted} - {cycleStats.endFormatted}
                  </p>
                  
                  {/* Gradient Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-bold text-primary">{cycleStats.progress}%</span>
                    </div>
                    <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                        style={{ width: `${cycleStats.progress}%` }}
                      />
                      {cycleStats.progress >= 30 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white drop-shadow-md">
                            Day {cycleStats.currentDay} of 90
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard value={cycleStats.currentDay} label="Current Day" />
                    <StatCard value={`Week ${cycleStats.currentWeek}`} label={`of ${cycleStats.totalWeeks}`} />
                    <StatCard value={cycleStats.daysRemaining} label="Days Left" highlight />
                  </div>
                  
                  {/* Dynamic Alert */}
                  {dynamicAlert && (
                    <Alert className={cn(
                      "relative overflow-hidden border-l-4 shadow-sm",
                      dynamicAlert.className
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-r from-current/5 to-transparent" />
                      <div className="relative flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-current/10 flex items-center justify-center shrink-0">
                          {dynamicAlert.icon}
                        </div>
                        <div>
                          <AlertDescription className="font-semibold">
                            {dynamicAlert.message}
                          </AlertDescription>
                          {dynamicAlert.subtext && (
                            <p className="text-xs mt-1 opacity-80">{dynamicAlert.subtext}</p>
                          )}
                        </div>
                      </div>
                    </Alert>
                  )}
                </div>
              )}
            </WidgetCard>

            {/* Planning Next Steps */}
            <WidgetCard
              title="Planning Next Steps"
              icon={<ListTodo className="h-5 w-5 text-primary" />}
              gradientClass="from-green-500/5"
            >
              {planningLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {!planningLoading && (
                <div className="relative">
                  {/* Connection line */}
                  <div className={cn(
                    "absolute left-4 top-0 bottom-0 w-0.5",
                    allComplete 
                      ? "bg-green-500" 
                      : "bg-gradient-to-b from-green-500 via-green-500/50 to-muted"
                  )} />
                  
                  <div className="space-y-4 relative">
                    {/* Quarter */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all",
                        hasCycle ? "bg-green-500" : "bg-muted"
                      )}>
                        {hasCycle ? (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={cn("font-medium", hasCycle && "text-green-600 dark:text-green-400")}>
                          Quarter Planned
                        </p>
                        {!hasCycle && (
                          <Button size="sm" className="mt-2 gap-2 shadow-lg shadow-primary/20" asChild>
                            <Link to="/cycle-setup">
                              Set 90-Day Goal
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Week */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all",
                        hasWeeklyPlan ? "bg-green-500" : hasCycle ? "bg-yellow-500" : "bg-muted"
                      )}>
                        {hasWeeklyPlan ? (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        ) : hasCycle ? (
                          <Clock className="h-5 w-5 text-white" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={cn(
                          "font-medium",
                          hasWeeklyPlan && "text-green-600 dark:text-green-400",
                          !hasWeeklyPlan && hasCycle && "text-yellow-600 dark:text-yellow-400"
                        )}>
                          Week Planned
                        </p>
                        {hasCycle && !hasWeeklyPlan && (
                          <Button size="sm" className="mt-2 gap-2 shadow-lg shadow-primary/20" asChild>
                            <Link to="/weekly-plan">
                              Plan This Week
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Day */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all",
                        hasDailyPlan ? "bg-green-500" : hasWeeklyPlan ? "bg-yellow-500" : "bg-muted"
                      )}>
                        {hasDailyPlan ? (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        ) : hasWeeklyPlan ? (
                          <Clock className="h-5 w-5 text-white" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={cn(
                          "font-medium",
                          hasDailyPlan && "text-green-600 dark:text-green-400",
                          !hasDailyPlan && hasWeeklyPlan && "text-yellow-600 dark:text-yellow-400"
                        )}>
                          Today Planned
                        </p>
                        {hasWeeklyPlan && !hasDailyPlan && (
                          <Button size="sm" className="mt-2 gap-2 shadow-lg shadow-primary/20" asChild>
                            <Link to="/daily-plan">
                              Plan Today
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {allComplete && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Sparkles className="h-5 w-5" />
                        <p className="font-semibold">All set! Time to execute.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </WidgetCard>

            {/* 90-Day Goal */}
            <WidgetCard
              title="90-Day Goal"
              icon={<Target className="h-5 w-5 text-primary" />}
              gradientClass="from-purple-500/5"
            >
              {cycleLoading && <Skeleton className="h-5 w-3/4" />}
              {!cycleLoading && !cycle && (
                <p className="text-muted-foreground text-sm">No active cycle</p>
              )}
              {!cycleLoading && cycle && (
                <div className="space-y-3">
                  <p className="text-base font-medium leading-relaxed">{cycle.goal || 'No goal set'}</p>
                  <Button variant="outline" size="sm" className="gap-2 group" asChild>
                    <Link to="/cycle-setup">
                      <Pencil className="h-4 w-4" />
                      Edit Goal
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              )}
            </WidgetCard>

            {/* Launch Countdown */}
            <WidgetCard
              title="Launch Countdown"
              icon={<Rocket className="h-5 w-5 text-primary" />}
              gradientClass="from-orange-500/5"
            >
              {launchesLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}

              {/* State 1: No Launch */}
              {!launchesLoading && !launchDisplay && (
                <div className="text-center py-8 px-4">
                  <div className="relative mb-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5 mx-auto flex items-center justify-center">
                      <Rocket className="h-10 w-10 text-orange-500/60" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-6 w-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-yellow-900" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No launches scheduled</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Planning a launch? Let's create a timeline and track your progress
                  </p>
                  <Button size="lg" className="gap-2 shadow-lg shadow-primary/20" asChild>
                    <Link to="/wizards/launch-planner">
                      <Rocket className="h-4 w-4" />
                      Plan Your First Launch
                    </Link>
                  </Button>
                </div>
              )}

              {/* State 2: Far (30+ days) */}
              {!launchesLoading && launchDisplay && launchDisplay.launchState === 'far' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{launchDisplay.name}</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {launchDisplay.daysUntilOpen} days away
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cart opens {launchDisplay.cartOpensFormatted} → closes {launchDisplay.cartClosesFormatted}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Compass className="h-4 w-4 text-primary" />
                    <span>Focus on your cycle goals for now</span>
                  </div>
                  {launchDisplay.taskPercent > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Prep progress</span>
                        <span>{launchDisplay.taskPercent}%</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                          style={{ width: `${launchDisplay.taskPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* State 3: Approaching (7-29 days) */}
              {!launchesLoading && launchDisplay && launchDisplay.launchState === 'approaching' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{launchDisplay.name}</span>
                    <span className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded font-medium">
                      {launchDisplay.daysUntilOpen} days until launch
                    </span>
                  </div>
                  <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-l-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <AlertDescription className="font-medium">
                        Time to finalize launch prep!
                      </AlertDescription>
                    </div>
                  </Alert>
                  <p className="text-sm text-muted-foreground">
                    Cart opens {launchDisplay.cartOpensFormatted}
                  </p>
                  {launchDisplay.taskPercent > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tasks complete</span>
                        <span>{launchDisplay.tasksCompleted}/{launchDisplay.tasksTotal}</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all"
                          style={{ width: `${launchDisplay.taskPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* State 4: Imminent (1-6 days) */}
              {!launchesLoading && launchDisplay && launchDisplay.launchState === 'imminent' && (
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {launchDisplay.daysUntilOpen}
                        </div>
                      </div>
                      <div className="absolute -top-1 -right-1 h-6 w-6 bg-orange-500 rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">
                        {launchDisplay.daysUntilOpen === 1 ? 'Launch tomorrow!' : `Launch in ${launchDisplay.daysUntilOpen} days!`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {launchDisplay.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* State 5: Live */}
              {!launchesLoading && launchDisplay && launchDisplay.launchState === 'live' && (
                <div className="relative overflow-hidden bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
                  <div className="relative flex items-center gap-4">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="font-bold text-lg flex items-center gap-2">
                        <span className="text-green-600 dark:text-green-400">● LIVE NOW</span>
                        <span>•</span>
                        <span>{launchDisplay.daysUntilClose} days left</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {launchDisplay.name}
                      </p>
                    </div>
                  </div>
                  {launchDisplay.revenue_goal && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Revenue Goal</span>
                        <span>${launchDisplay.revenue_goal.toLocaleString()}</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all"
                          style={{ width: '0%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* State 6: Just Closed */}
              {!launchesLoading && launchDisplay && launchDisplay.launchState === 'closed' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{launchDisplay.name}</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      Completed
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Launch closed on {launchDisplay.cartClosesFormatted}
                  </p>
                  <Button variant="outline" size="sm" className="gap-2 group" asChild>
                    <Link to={`/launches/${launchDisplay.id}/debrief`}>
                      Complete Debrief
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              )}
            </WidgetCard>

            {/* Sales Goal Tracker */}
            <SalesGoalTrackerWidget 
              cycleId={cycle?.cycle_id} 
              cycleStartDate={cycle?.start_date}
              cycleEndDate={cycle?.end_date}
            />

            {/* Content Counter */}
            <ContentCounterWidget cycleId={cycle?.cycle_id} />

          </div>

          {/* Sidebar - 1 col */}
          <div className="space-y-6">
            {/* Business Diagnostic */}
            <WidgetCard
              title="Business Diagnostic"
              icon={<BarChart3 className="h-5 w-5 text-primary" />}
              gradientClass="from-cyan-500/5"
            >
              {(cycleLoading || diagnosticLoading) && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              )}

              {!cycleLoading && !diagnosticLoading && !cycle && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-2">No active cycle</p>
                  <Link to="/cycle-setup" className="text-primary text-sm hover:underline">
                    Start your 90-day cycle →
                  </Link>
                </div>
              )}

              {!cycleLoading && !diagnosticLoading && cycle && !diagnosticDisplay?.discover && !diagnosticDisplay?.nurture && !diagnosticDisplay?.convert && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-3">No diagnostic scores recorded</p>
                  <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Take Diagnostic
                      </Button>
                    </DialogTrigger>
                    <DiagnosticDialogContent
                      discoverScore={discoverScore}
                      setDiscoverScore={setDiscoverScore}
                      nurtureScore={nurtureScore}
                      setNurtureScore={setNurtureScore}
                      convertScore={convertScore}
                      setConvertScore={setConvertScore}
                      onSave={() => updateDiagnostic.mutate({ discover: discoverScore, nurture: nurtureScore, convert: convertScore })}
                      isPending={updateDiagnostic.isPending}
                    />
                  </Dialog>
                </div>
              )}

              {!cycleLoading && !diagnosticLoading && cycle && diagnosticDisplay && (diagnosticDisplay.discover > 0 || diagnosticDisplay.nurture > 0 || diagnosticDisplay.convert > 0) && (
                <div className="space-y-4">
                  {/* Focus Area Highlight */}
                  <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                    <Compass className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      Focus: <span className="font-semibold capitalize">{diagnosticDisplay.focusArea}</span>
                    </span>
                  </div>

                  {/* Score Bars */}
                  <div className="space-y-3">
                    {/* Discover */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={diagnosticDisplay.focusArea === 'discover' ? 'font-semibold' : ''}>
                          Discover {diagnosticDisplay.focusArea === 'discover' && '← Focus'}
                        </span>
                        <span className={getScoreColor(diagnosticDisplay.discover)}>{diagnosticDisplay.discover}/10</span>
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all",
                            diagnosticDisplay.focusArea === 'discover' ? getProgressBarGradient(diagnosticDisplay.discover) : "from-blue-400 to-blue-600"
                          )}
                          style={{ width: `${diagnosticDisplay.discover * 10}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Nurture */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={diagnosticDisplay.focusArea === 'nurture' ? 'font-semibold' : ''}>
                          Nurture {diagnosticDisplay.focusArea === 'nurture' && '← Focus'}
                        </span>
                        <span className={getScoreColor(diagnosticDisplay.nurture)}>{diagnosticDisplay.nurture}/10</span>
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all",
                            diagnosticDisplay.focusArea === 'nurture' ? getProgressBarGradient(diagnosticDisplay.nurture) : "from-yellow-400 to-yellow-600"
                          )}
                          style={{ width: `${diagnosticDisplay.nurture * 10}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Convert */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={diagnosticDisplay.focusArea === 'convert' ? 'font-semibold' : ''}>
                          Convert {diagnosticDisplay.focusArea === 'convert' && '← Focus'}
                        </span>
                        <span className={getScoreColor(diagnosticDisplay.convert)}>{diagnosticDisplay.convert}/10</span>
                      </div>
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all",
                            diagnosticDisplay.focusArea === 'convert' ? getProgressBarGradient(diagnosticDisplay.convert) : "from-green-400 to-green-600"
                          )}
                          style={{ width: `${diagnosticDisplay.convert * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Last Updated */}
                  <p className="text-xs text-muted-foreground">
                    Last updated: Week {diagnosticDisplay.weekOfCycle} (Day {diagnosticDisplay.dayOfCycle})
                  </p>

                  {/* Retake Warning */}
                  {diagnosticDisplay.needsRetake && (
                    <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-l-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="font-medium text-sm">
                          Time to retake ({diagnosticDisplay.daysSinceUpdate} days ago)
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Retake
                        </Button>
                      </DialogTrigger>
                      <DiagnosticDialogContent
                        discoverScore={discoverScore}
                        setDiscoverScore={setDiscoverScore}
                        nurtureScore={nurtureScore}
                        setNurtureScore={setNurtureScore}
                        convertScore={convertScore}
                        setConvertScore={setConvertScore}
                        onSave={() => updateDiagnostic.mutate({ discover: discoverScore, nurture: nurtureScore, convert: convertScore })}
                        isPending={updateDiagnostic.isPending}
                      />
                    </Dialog>
                    <Button variant="outline" size="sm" className="gap-2 group" asChild>
                      <Link to="/cycle-setup">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </WidgetCard>

            {/* Habit Tracker */}
            <HabitTrackerWidget />

            {/* Quick Wins */}
            <QuickWinsWidget 
              cycleId={cycle?.cycle_id} 
              cycleStartDate={cycle?.start_date}
            />

            {/* Mastermind Calls */}
            <WidgetCard
              title="Mastermind Calls"
              icon={<Calendar className="h-5 w-5 text-primary" />}
              gradientClass="from-indigo-500/5"
            >
              <MastermindCallWidget />
            </WidgetCard>

            {/* Podcast */}
            <WidgetCard
              title="Latest Episode"
              icon={<FileText className="h-5 w-5 text-primary" />}
              gradientClass="from-pink-500/5"
            >
              <PodcastWidget />
            </WidgetCard>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ======================
// Content Counter Widget
// ======================

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'blog', label: 'Blog' },
  { value: 'other', label: 'Other' },
];

function ContentCounterWidget({ cycleId }: { cycleId?: string }) {
  const queryClient = useQueryClient();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logPlatform, setLogPlatform] = useState('');
  const [logDate, setLogDate] = useState<Date | undefined>(new Date());
  const [logTitle, setLogTitle] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch content counts for this week/month/quarter
  const { data: contentStats, isLoading } = useQuery({
    queryKey: ['content-stats', cycleId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const today = new Date();
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      const quarterStart = format(startOfQuarter(today), 'yyyy-MM-dd');
      const quarterEnd = format(endOfQuarter(today), 'yyyy-MM-dd');

      // Get all content logs for the quarter
      const { data: logs } = await supabase
        .from('content_log')
        .select('id, platform, date')
        .eq('user_id', session.user.id)
        .gte('date', quarterStart)
        .lte('date', quarterEnd);

      if (!logs) return { week: {}, month: {}, quarter: {}, weekTotal: 0, monthTotal: 0, quarterTotal: 0 };

      // Count by platform and period
      const weekCounts: Record<string, number> = {};
      const monthCounts: Record<string, number> = {};
      const quarterCounts: Record<string, number> = {};
      let weekTotal = 0;
      let monthTotal = 0;
      let quarterTotal = 0;

      logs.forEach(log => {
        const logDate = log.date;
        const platform = log.platform;

        // Quarter
        quarterCounts[platform] = (quarterCounts[platform] || 0) + 1;
        quarterTotal++;

        // Month
        if (logDate >= monthStart && logDate <= monthEnd) {
          monthCounts[platform] = (monthCounts[platform] || 0) + 1;
          monthTotal++;
        }

        // Week
        if (logDate >= weekStart && logDate <= weekEnd) {
          weekCounts[platform] = (weekCounts[platform] || 0) + 1;
          weekTotal++;
        }
      });

      return { 
        week: weekCounts, 
        month: monthCounts, 
        quarter: quarterCounts,
        weekTotal,
        monthTotal,
        quarterTotal,
      };
    },
    staleTime: 30 * 1000,
  });

  // Mutation to log content
  const logContent = useMutation({
    mutationFn: async () => {
      if (!logPlatform || !logDate) throw new Error('Platform and date required');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('content_log')
        .insert({
          user_id: session.user.id,
          cycle_id: cycleId || null,
          platform: logPlatform,
          date: format(logDate, 'yyyy-MM-dd'),
          title: logTitle || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-stats'] });
      toast.success('Content logged!');
      setLogDialogOpen(false);
      setLogPlatform('');
      setLogDate(new Date());
      setLogTitle('');
    },
    onError: () => {
      toast.error('Failed to log content');
    },
  });

  // Get platforms with counts (sorted by count desc)
  const platformsWithCounts = useMemo(() => {
    if (!contentStats?.week) return [];
    
    const allPlatforms = new Set([
      ...Object.keys(contentStats.week || {}),
      ...Object.keys(contentStats.month || {}),
      ...Object.keys(contentStats.quarter || {}),
    ]);

    return Array.from(allPlatforms)
      .map(platform => ({
        platform,
        label: PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform,
        weekCount: contentStats.week[platform] || 0,
      }))
      .sort((a, b) => b.weekCount - a.weekCount);
  }, [contentStats]);

  return (
    <WidgetCard
      title="Content Counter"
      icon={<FileText className="h-5 w-5 text-primary" />}
      gradientClass="from-pink-500/5"
    >
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      )}

      {!isLoading && (!contentStats || contentStats.weekTotal === 0) && (
        <div className="text-center py-6">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-500/5 mx-auto flex items-center justify-center">
              <FileText className="h-8 w-8 text-pink-500/60" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-3">No content logged this week</p>
          <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Log Content
              </Button>
            </DialogTrigger>
            <LogContentDialogContent
              platform={logPlatform}
              setPlatform={setLogPlatform}
              date={logDate}
              setDate={setLogDate}
              title={logTitle}
              setTitle={setLogTitle}
              datePickerOpen={datePickerOpen}
              setDatePickerOpen={setDatePickerOpen}
              onSave={() => logContent.mutate()}
              isPending={logContent.isPending}
            />
          </Dialog>
        </div>
      )}

      {!isLoading && contentStats && contentStats.weekTotal > 0 && (
        <div className="space-y-4">
          {/* Platform list */}
          <div className="space-y-2">
            {platformsWithCounts.slice(0, 5).map(({ platform, label, weekCount }) => (
              <div key={platform} className="flex items-center justify-between text-sm">
                <span className="capitalize">{label}</span>
                <span className="font-medium">{weekCount}</span>
              </div>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
              <div className="text-lg font-bold">{contentStats.weekTotal}</div>
              <div className="text-xs text-muted-foreground">Week</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
              <div className="text-lg font-bold">{contentStats.monthTotal}</div>
              <div className="text-xs text-muted-foreground">Month</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
              <div className="text-lg font-bold">{contentStats.quarterTotal}</div>
              <div className="text-xs text-muted-foreground">Quarter</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Log
                </Button>
              </DialogTrigger>
              <LogContentDialogContent
                platform={logPlatform}
                setPlatform={setLogPlatform}
                date={logDate}
                setDate={setLogDate}
                title={logTitle}
                setTitle={setLogTitle}
                datePickerOpen={datePickerOpen}
                setDatePickerOpen={setDatePickerOpen}
                onSave={() => logContent.mutate()}
                isPending={logContent.isPending}
              />
            </Dialog>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to="/content-calendar">
                <Calendar className="h-4 w-4" />
                Calendar
              </Link>
            </Button>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

// Log Content Dialog Content
function LogContentDialogContent({
  platform,
  setPlatform,
  date,
  setDate,
  title,
  setTitle,
  datePickerOpen,
  setDatePickerOpen,
  onSave,
  isPending,
}: {
  platform: string;
  setPlatform: (v: string) => void;
  date: Date | undefined;
  setDate: (v: Date | undefined) => void;
  title: string;
  setTitle: (v: string) => void;
  datePickerOpen: boolean;
  setDatePickerOpen: (v: boolean) => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Log Content</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Platform *</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setDatePickerOpen(false);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Title (optional)</Label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Weekly newsletter #12"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button 
          onClick={onSave}
          disabled={isPending || !platform || !date}
        >
          {isPending ? 'Saving...' : 'Log Content'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Diagnostic Dialog Content
function DiagnosticDialogContent({
  discoverScore,
  setDiscoverScore,
  nurtureScore,
  setNurtureScore,
  convertScore,
  setConvertScore,
  onSave,
  isPending,
}: {
  discoverScore: number;
  setDiscoverScore: (v: number) => void;
  nurtureScore: number;
  setNurtureScore: (v: number) => void;
  convertScore: number;
  setConvertScore: (v: number) => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Business Diagnostic</DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Discover</span>
            <span className={`text-sm font-bold ${getScoreColor(discoverScore)}`}>{discoverScore}/10</span>
          </div>
          <Slider
            value={[discoverScore]}
            onValueChange={(v) => setDiscoverScore(v[0])}
            min={1}
            max={10}
            step={1}
          />
          <p className="text-xs text-muted-foreground">How easily do new people find you?</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Nurture</span>
            <span className={`text-sm font-bold ${getScoreColor(nurtureScore)}`}>{nurtureScore}/10</span>
          </div>
          <Slider
            value={[nurtureScore]}
            onValueChange={(v) => setNurtureScore(v[0])}
            min={1}
            max={10}
            step={1}
          />
          <p className="text-xs text-muted-foreground">How well do you build relationships?</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Convert</span>
            <span className={`text-sm font-bold ${getScoreColor(convertScore)}`}>{convertScore}/10</span>
          </div>
          <Slider
            value={[convertScore]}
            onValueChange={(v) => setConvertScore(v[0])}
            min={1}
            max={10}
            step={1}
          />
          <p className="text-xs text-muted-foreground">How effectively do you turn leads into sales?</p>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button 
          onClick={onSave}
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
