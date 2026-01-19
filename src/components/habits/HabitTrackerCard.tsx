import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HabitRow } from './HabitRow';
import { HabitProgressRing } from './HabitProgressRing';
import { StreakBadge } from './StreakBadge';
import { WeeklyHabitGrid } from './WeeklyHabitGrid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Target, Sparkles, ChevronRight, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Habit {
  habit_id: string;
  habit_name: string;
  category?: string | null;
  type?: string | null;
}

interface HabitLog {
  habit_id: string;
  date: string;
  completed: boolean;
}

interface HabitProgress {
  habit_id: string;
  streak: number;
  week_percent: number;
}

interface HabitTrackerCardProps {
  view: 'daily' | 'weekly' | 'monthly';
  compact?: boolean;
  className?: string;
}

export function HabitTrackerCard({ view, compact = false, className }: HabitTrackerCardProps) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<HabitLog[]>([]);
  const [weekLogs, setWeekLogs] = useState<HabitLog[]>([]);
  const [progress, setProgress] = useState<HabitProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Load habits
      const { data: habitsData } = await supabase.functions.invoke('get-habits');
      const activeHabits = (habitsData?.habits || []).filter(
        (h: Habit & { is_archived?: boolean; is_active?: boolean }) => 
          !h.is_archived && h.is_active !== false
      );
      setHabits(activeHabits);

      // Load today's logs
      const { data: todayData } = await supabase
        .from('habit_logs')
        .select('habit_id, date, completed')
        .eq('user_id', user.id)
        .eq('date', today);
      setTodayLogs(todayData || []);

      // Load week logs
      const { data: weekData } = await supabase
        .from('habit_logs')
        .select('habit_id, date, completed')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd);
      setWeekLogs(weekData || []);

      // Load progress (streaks)
      const { data: progressData } = await supabase.functions.invoke('get-habit-progress');
      setProgress(progressData?.habits || []);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  }, [user, today, weekStart, weekEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleHabit = async (habitId: string) => {
    if (!user || toggling) return;

    setToggling(habitId);
    const currentLog = todayLogs.find((l) => l.habit_id === habitId);
    const newCompleted = !currentLog?.completed;

    try {
      await supabase.rpc('toggle_habit', {
        p_user_id: user.id,
        p_habit_id: habitId,
        p_date: today,
      });

      // Optimistic update
      setTodayLogs((prev) => {
        const existing = prev.find((l) => l.habit_id === habitId);
        if (existing) {
          return prev.map((l) =>
            l.habit_id === habitId ? { ...l, completed: newCompleted } : l
          );
        }
        return [...prev, { habit_id: habitId, date: today, completed: newCompleted }];
      });

      if (newCompleted) {
        const habit = habits.find((h) => h.habit_id === habitId);
        const streak = (progress.find((p) => p.habit_id === habitId)?.streak || 0) + 1;
        if (streak === 7) {
          toast.success(`🔥 One week streak on ${habit?.habit_name}!`);
        } else if (streak === 30) {
          toast.success(`🏆 30-day warrior on ${habit?.habit_name}!`);
        }
      }
    } catch (error) {
      console.error('Error toggling habit:', error);
      toast.error('Failed to update habit');
    } finally {
      setToggling(null);
    }
  };

  const isCompleted = (habitId: string) =>
    todayLogs.find((l) => l.habit_id === habitId)?.completed || false;

  const getHabitWeekLogs = (habitId: string) =>
    weekLogs.filter((l) => l.habit_id === habitId);

  const getHabitStreak = (habitId: string) =>
    progress.find((p) => p.habit_id === habitId)?.streak || 0;

  const completedCount = habits.filter((h) => isCompleted(h.habit_id)).length;
  const bestStreak = Math.max(0, ...progress.map((p) => p.streak));
  const bestStreakHabit = progress.find((p) => p.streak === bestStreak);
  const bestStreakName = habits.find((h) => h.habit_id === bestStreakHabit?.habit_id)?.habit_name;

  const allComplete = habits.length > 0 && completedCount === habits.length;

  const getMotivationalMessage = () => {
    if (allComplete) return "Perfect day! Keep the momentum! 🎉";
    if (completedCount === 0) return "Start your streak today!";
    if (completedCount >= habits.length / 2) return "You're on a roll!";
    return "Every habit counts!";
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Today's Habits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            No habits set up yet. Create habits to track your daily progress.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/habits">Set Up Habits</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Daily view - full interaction
  if (view === 'daily') {
    return (
      <Card className={cn(className, allComplete && 'ring-2 ring-green-500/50')}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Today's Habits
              {allComplete && <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />}
            </CardTitle>
            <HabitProgressRing completed={completedCount} total={habits.length} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground">{getMotivationalMessage()}</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {habits.map((habit) => (
            <HabitRow
              key={habit.habit_id}
              habit={habit}
              isCompleted={isCompleted(habit.habit_id)}
              streak={getHabitStreak(habit.habit_id)}
              weekLogs={getHabitWeekLogs(habit.habit_id)}
              onToggle={toggleHabit}
              disabled={toggling === habit.habit_id}
              compact={compact}
            />
          ))}

          {bestStreak > 0 && (
            <div className="pt-3 border-t mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Best streak:</span>
                <StreakBadge streak={bestStreak} size="sm" />
                {bestStreakName && (
                  <span className="text-xs">({bestStreakName})</span>
                )}
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/habits" className="flex items-center gap-1">
                  Manage <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Weekly/Monthly view - summary mode
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Habit Consistency
          </CardTitle>
          {view === 'weekly' && (
            <HabitProgressRing completed={completedCount} total={habits.length} size="sm" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {habits.slice(0, compact ? 3 : 5).map((habit) => (
          <div
            key={habit.habit_id}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate text-sm">{habit.habit_name}</span>
              <StreakBadge streak={getHabitStreak(habit.habit_id)} size="sm" />
            </div>
            <WeeklyHabitGrid logs={getHabitWeekLogs(habit.habit_id)} showLabels={view === 'weekly'} />
          </div>
        ))}

        {habits.length > (compact ? 3 : 5) && (
          <p className="text-xs text-muted-foreground text-center">
            +{habits.length - (compact ? 3 : 5)} more habits
          </p>
        )}

        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {bestStreak > 0 && (
              <>
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">Top streak:</span>
                <StreakBadge streak={bestStreak} size="sm" showLabel />
              </>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/habits">View All</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
