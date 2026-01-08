import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Calendar, CalendarRange, Target, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';

interface PlanningCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  iconBgClass: string;
}

const planningCards: PlanningCard[] = [
  {
    title: 'Daily Planning',
    description: "Plan what's most important for today.",
    href: '/daily-plan',
    icon: CalendarDays,
    iconColorClass: 'text-violet-600',
    iconBgClass: 'bg-violet-100',
  },
  {
    title: 'Weekly Planner',
    description: 'Review and plan your weekly focus.',
    href: '/weekly-plan',
    icon: Calendar,
    iconColorClass: 'text-teal-600',
    iconBgClass: 'bg-teal-100',
  },
  {
    title: 'Monthly Planning',
    description: 'Set your main business focus for this month.',
    href: '/monthly-review',
    icon: CalendarRange,
    iconColorClass: 'text-rose-500',
    iconBgClass: 'bg-rose-100',
  },
  {
    title: '90-Day Goals',
    description: 'Define your quarterly goal and milestones.',
    href: '/cycle-setup',
    icon: Target,
    iconColorClass: 'text-purple-600',
    iconBgClass: 'bg-purple-100',
  },
];

interface PlanningStats {
  dailyPlansThisMonth: number;
  totalDaysThisMonth: number;
  weeklyPlansThisMonth: number;
  totalWeeksThisMonth: number;
  monthlyPlanExists: boolean;
}

export default function Planning() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlanningStats>({
    dailyPlansThisMonth: 0,
    totalDaysThisMonth: 0,
    weeklyPlansThisMonth: 0,
    totalWeeksThisMonth: 0,
    monthlyPlanExists: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      // Calculate total days and weeks in month up to today
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: now });
      const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: now }, { weekStartsOn: 1 });
      
      try {
        // Fetch daily plans for this month
        const { data: dailyPlans } = await supabase
          .from('daily_plans')
          .select('date')
          .eq('user_id', user.id)
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(now, 'yyyy-MM-dd'));

        // Fetch weekly plans for this month
        const { data: weeklyPlans } = await supabase
          .from('weekly_plans')
          .select('start_of_week')
          .eq('user_id', user.id)
          .gte('start_of_week', format(monthStart, 'yyyy-MM-dd'))
          .lte('start_of_week', format(monthEnd, 'yyyy-MM-dd'));

        // Check if monthly review exists for current month
        const currentMonth = now.getMonth() + 1;
        const { data: monthlyReview } = await supabase
          .from('monthly_reviews')
          .select('review_id')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle();

        setStats({
          dailyPlansThisMonth: dailyPlans?.length || 0,
          totalDaysThisMonth: daysInMonth.length,
          weeklyPlansThisMonth: weeklyPlans?.length || 0,
          totalWeeksThisMonth: weeksInMonth.length,
          monthlyPlanExists: !!monthlyReview,
        });
      } catch (error) {
        console.error('Error fetching planning stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const dailyPercentage = stats.totalDaysThisMonth > 0 
    ? Math.round((stats.dailyPlansThisMonth / stats.totalDaysThisMonth) * 100) 
    : 0;
  
  const weeklyPercentage = stats.totalWeeksThisMonth > 0 
    ? Math.round((stats.weeklyPlansThisMonth / stats.totalWeeksThisMonth) * 100) 
    : 0;

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Planning</h1>
        <p className="text-muted-foreground">Your planning command center</p>
      </div>

      {/* Planning Tracker */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          This Month's Planning Progress
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Daily Plans */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              dailyPercentage >= 80 ? 'bg-green-100 text-green-600' : 'bg-violet-100 text-violet-600'
            )}>
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Daily Plans</p>
              <p className="text-lg font-bold">
                {stats.dailyPlansThisMonth}/{stats.totalDaysThisMonth}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({dailyPercentage}%)
                </span>
              </p>
            </div>
          </div>

          {/* Weekly Plans */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              weeklyPercentage >= 80 ? 'bg-green-100 text-green-600' : 'bg-teal-100 text-teal-600'
            )}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Weekly Plans</p>
              <p className="text-lg font-bold">
                {stats.weeklyPlansThisMonth}/{stats.totalWeeksThisMonth}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({weeklyPercentage}%)
                </span>
              </p>
            </div>
          </div>

          {/* Monthly Plan */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              stats.monthlyPlanExists ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
            )}>
              {stats.monthlyPlanExists ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <CalendarRange className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Monthly Plan</p>
              <p className="text-lg font-bold">
                {stats.monthlyPlanExists ? 'Complete' : 'Not started'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Planning Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Planning Options
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {planningCards.map((card) => (
            <Link key={card.href} to={card.href}>
              <Card className="p-5 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group h-full">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                    card.iconBgClass
                  )}>
                    <card.icon className={cn('h-6 w-6', card.iconColorClass)} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
