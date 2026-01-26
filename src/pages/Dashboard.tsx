import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveCycle } from '@/hooks/useActiveCycle';
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
  Calendar
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
  const { data: cycle, isLoading } = useActiveCycle();

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
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            )}

            {!isLoading && !cycleStats && (
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

            {!isLoading && cycleStats && (
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
            <p className="text-muted-foreground text-sm">Your next actions will appear here</p>
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
