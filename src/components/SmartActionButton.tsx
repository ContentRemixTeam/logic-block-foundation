import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Target, Calendar, Sun, Moon } from 'lucide-react';

interface PlanningState {
  hasCycle: boolean;
  hasWeeklyPlan: boolean;
  hasDailyPlan: boolean;
}

export function SmartActionButton() {
  const { user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<PlanningState>({
    hasCycle: false,
    hasWeeklyPlan: false,
    hasDailyPlan: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlanningState = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('get-dashboard-summary');
        
        if (error || !data?.data) {
          setLoading(false);
          return;
        }

        const summary = data.data;
        const today = new Date().toISOString().split('T')[0];

        // Check if cycle exists
        const hasCycle = Boolean(summary.cycle?.goal);

        // Check if weekly plan exists (has priorities set)
        const weeklyPriorities = summary.weekly?.top_3_priorities;
        const hasWeeklyPlan = Array.isArray(weeklyPriorities) && 
          weeklyPriorities.some((p: string) => p && p.trim() !== '');

        // Check if daily plan exists for today
        const dailyTop3 = summary.daily?.top_3_today;
        const hasDailyPlan = Array.isArray(dailyTop3) && 
          dailyTop3.some((t: string) => t && t.trim() !== '');

        setState({
          hasCycle,
          hasWeeklyPlan,
          hasDailyPlan,
        });
      } catch (err) {
        console.error('Error checking planning state:', err);
      } finally {
        setLoading(false);
      }
    };

    checkPlanningState();
  }, [user]);

  if (loading || !user) return null;

  // Determine what to show based on state
  let label: string;
  let to: string;
  let Icon: typeof Target;

  if (!state.hasCycle) {
    label = 'PLAN MY CYCLE';
    to = '/cycle-setup';
    Icon = Target;
  } else if (!state.hasWeeklyPlan) {
    label = 'PLAN MY WEEK';
    to = '/weekly-plan';
    Icon = Calendar;
  } else if (!state.hasDailyPlan) {
    label = 'PLAN MY DAY';
    to = '/daily-plan';
    Icon = Sun;
  } else {
    label = 'WRAP UP';
    to = '/daily-review';
    Icon = Moon;
  }

  // Don't show if already on the target page
  if (location.pathname === to) return null;

  return (
    <Link to={to} className="fixed top-20 right-4 z-30 md:top-16 md:right-6">
      <Button 
        size="lg" 
        className="shadow-lg gap-2 font-semibold"
      >
        <Icon className="h-5 w-5" />
        {label}
      </Button>
    </Link>
  );
}
