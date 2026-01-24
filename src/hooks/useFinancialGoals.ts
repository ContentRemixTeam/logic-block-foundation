import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, format, differenceInDays, endOfMonth } from 'date-fns';

export interface MonthlyGoal {
  id: string;
  user_id: string;
  month: string;
  revenue_goal: number | null;
  expense_budget: number | null;
  profit_goal: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  currentRevenue: number;
  revenueGoal: number;
  revenueProgress: number;
  daysRemaining: number;
  dailyRevenueNeeded: number;
  isOnTrack: boolean;
  status: 'ahead' | 'on-track' | 'behind' | 'critical';
  projectedRevenue: number;
}

export interface CycleGoalProgress {
  cycleRevenueGoal: number | null;
  cycleCurrentRevenue: number;
  cycleDaysRemaining: number;
  cycleDailyRevenueNeeded: number;
  cycleProgress: number;
  cycleStatus: 'ahead' | 'on-track' | 'behind' | 'critical';
}

export function useFinancialGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [cycleGoal, setCycleGoal] = useState<number | null>(null);
  const [cycleStartDate, setCycleStartDate] = useState<Date | null>(null);
  const [cycleEndDate, setCycleEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const now = new Date();
      const currentMonth = format(startOfMonth(now), 'yyyy-MM-dd');

      // Load current month goal using raw query due to types not being generated yet
      const { data: goalData, error: goalError } = await (supabase
        .from('financial_monthly_goals' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle()) as { data: MonthlyGoal | null; error: any };

      if (goalError) throw goalError;
      setMonthlyGoal(goalData as MonthlyGoal | null);

      // Load 90-day cycle revenue goal
      const { data: cycleData, error: cycleError } = await supabase
        .from('cycle_revenue_plan')
        .select('revenue_goal, cycles_90_day!inner(start_date, end_date)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cycleError && cycleData) {
        setCycleGoal(Number(cycleData.revenue_goal) || null);
        const cycle = cycleData.cycles_90_day as any;
        if (cycle) {
          setCycleStartDate(new Date(cycle.start_date));
          setCycleEndDate(new Date(cycle.end_date));
        }
      }
    } catch (error: any) {
      console.error('Error loading financial goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const setMonthlyRevenueGoal = async (amount: number, notes?: string) => {
    if (!user) return false;

    try {
      const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      
      // Using raw query due to types not being generated yet
      const { data, error } = await (supabase
        .from('financial_monthly_goals' as any)
        .upsert({
          user_id: user.id,
          month: currentMonth,
          revenue_goal: amount,
          notes: notes || null,
        }, {
          onConflict: 'user_id,month',
        })
        .select()
        .single()) as { data: MonthlyGoal | null; error: any };

      if (error) throw error;
      setMonthlyGoal(data as MonthlyGoal);
      toast({ title: '🎯 Monthly goal set!' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Error setting goal',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const calculateMonthlyProgress = (currentRevenue: number): GoalProgress | null => {
    if (!monthlyGoal?.revenue_goal) return null;

    const now = new Date();
    const monthEnd = endOfMonth(now);
    const daysRemaining = Math.max(0, differenceInDays(monthEnd, now) + 1);
    const daysInMonth = differenceInDays(monthEnd, startOfMonth(now)) + 1;
    const daysPassed = daysInMonth - daysRemaining;

    const revenueGoal = Number(monthlyGoal.revenue_goal);
    const revenueProgress = (currentRevenue / revenueGoal) * 100;
    const expectedProgress = (daysPassed / daysInMonth) * 100;
    
    const dailyRevenueNeeded = daysRemaining > 0 
      ? Math.max(0, (revenueGoal - currentRevenue) / daysRemaining)
      : 0;

    const avgDailyRevenue = daysPassed > 0 ? currentRevenue / daysPassed : 0;
    const projectedRevenue = avgDailyRevenue * daysInMonth;

    let status: 'ahead' | 'on-track' | 'behind' | 'critical';
    if (revenueProgress >= expectedProgress * 1.1) {
      status = 'ahead';
    } else if (revenueProgress >= expectedProgress * 0.9) {
      status = 'on-track';
    } else if (revenueProgress >= expectedProgress * 0.7) {
      status = 'behind';
    } else {
      status = 'critical';
    }

    return {
      currentRevenue,
      revenueGoal,
      revenueProgress: Math.min(100, revenueProgress),
      daysRemaining,
      dailyRevenueNeeded,
      isOnTrack: status === 'ahead' || status === 'on-track',
      status,
      projectedRevenue,
    };
  };

  const calculateCycleProgress = (cycleRevenue: number): CycleGoalProgress | null => {
    if (!cycleGoal || !cycleStartDate || !cycleEndDate) return null;

    const now = new Date();
    const cycleDaysRemaining = Math.max(0, differenceInDays(cycleEndDate, now));
    const totalCycleDays = differenceInDays(cycleEndDate, cycleStartDate);
    const daysPassed = totalCycleDays - cycleDaysRemaining;

    const cycleProgress = (cycleRevenue / cycleGoal) * 100;
    const expectedProgress = totalCycleDays > 0 ? (daysPassed / totalCycleDays) * 100 : 0;
    
    const cycleDailyRevenueNeeded = cycleDaysRemaining > 0 
      ? Math.max(0, (cycleGoal - cycleRevenue) / cycleDaysRemaining)
      : 0;

    let cycleStatus: 'ahead' | 'on-track' | 'behind' | 'critical';
    if (cycleProgress >= expectedProgress * 1.1) {
      cycleStatus = 'ahead';
    } else if (cycleProgress >= expectedProgress * 0.9) {
      cycleStatus = 'on-track';
    } else if (cycleProgress >= expectedProgress * 0.7) {
      cycleStatus = 'behind';
    } else {
      cycleStatus = 'critical';
    }

    return {
      cycleRevenueGoal: cycleGoal,
      cycleCurrentRevenue: cycleRevenue,
      cycleDaysRemaining,
      cycleDailyRevenueNeeded,
      cycleProgress: Math.min(100, cycleProgress),
      cycleStatus,
    };
  };

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  return {
    monthlyGoal,
    cycleGoal,
    cycleStartDate,
    cycleEndDate,
    isLoading,
    setMonthlyRevenueGoal,
    calculateMonthlyProgress,
    calculateCycleProgress,
    refresh: loadGoals,
  };
}
