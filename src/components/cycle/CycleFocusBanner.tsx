import { Link } from 'react-router-dom';
import { Target, ArrowRight, Calendar } from 'lucide-react';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthPlan {
  main_focus: string | null;
  month_number: number;
  month_name: string | null;
}

interface CycleFocusBannerProps {
  showWeeklyGoal?: boolean;
  weekStartDate?: string;
}

export function CycleFocusBanner({ showWeeklyGoal = false, weekStartDate }: CycleFocusBannerProps) {
  const { data: cycle, isLoading: cycleLoading } = useActiveCycle();
  const [monthFocus, setMonthFocus] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cycle) {
      setLoading(false);
      return;
    }

    const loadFocus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Calculate current month in cycle
        const start = new Date(cycle.start_date);
        const today = new Date();
        const diffMs = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const monthInCycle = Math.min(3, Math.max(1, Math.ceil((diffDays + 1) / 30)));

        // Fetch month plan
        const { data: monthPlan } = await supabase
          .from('cycle_month_plans')
          .select('main_focus, month_number, month_name')
          .eq('cycle_id', cycle.cycle_id)
          .eq('month_number', monthInCycle)
          .single();

        if (monthPlan?.main_focus) {
          setMonthFocus(monthPlan.main_focus);
        }

        // Fetch weekly goal if requested
        if (showWeeklyGoal && weekStartDate) {
          const { data: weeklyGoalData } = await supabase
            .from('weekly_goals')
            .select('weekly_goal_text')
            .eq('user_id', session.user.id)
            .eq('week_start_date', weekStartDate)
            .single();

          if (weeklyGoalData?.weekly_goal_text) {
            setWeeklyGoal(weeklyGoalData.weekly_goal_text);
          }
        }
      } catch (error) {
        console.error('Error loading focus:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFocus();
  }, [cycle, showWeeklyGoal, weekStartDate]);

  if (cycleLoading || loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  if (!cycle) {
    return null;
  }

  const hasContent = monthFocus || weeklyGoal || cycle.goal;
  if (!hasContent) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 text-sm">
      <Target className="h-4 w-4 text-primary shrink-0" />
      <span className="text-muted-foreground">This week supports:</span>
      
      {monthFocus && (
        <>
          <Link 
            to="/monthly-review" 
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {monthFocus}
          </Link>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        </>
      )}
      
      <Link 
        to="/cycle-summary" 
        className="font-medium text-primary hover:underline"
      >
        {cycle.goal.length > 50 ? `${cycle.goal.slice(0, 50)}...` : cycle.goal}
      </Link>

      {showWeeklyGoal && weeklyGoal && (
        <div className="flex items-center gap-2 ml-auto">
          <Calendar className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs text-muted-foreground">Weekly goal:</span>
          <span className="text-xs font-medium">{weeklyGoal}</span>
        </div>
      )}
    </div>
  );
}
