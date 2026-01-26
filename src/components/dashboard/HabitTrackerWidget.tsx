import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, isToday, isFuture } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { CheckCircle2, Circle, Settings2 } from 'lucide-react';

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

interface Habit {
  habit_id: string;
  habit_name: string;
  display_order: number | null;
}

interface HabitLog {
  habit_id: string;
  date: string;
  completed: boolean;
}

export function HabitTrackerWidget() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const maxHabits = isMobile ? 3 : 5;

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch active habits
  const { data: habits, isLoading: habitsLoading } = useQuery({
    queryKey: ['dashboard-habits'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data } = await supabase
        .from('habits')
        .select('habit_id, habit_name, display_order')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .or('is_archived.is.null,is_archived.eq.false')
        .order('display_order', { ascending: true, nullsFirst: false })
        .limit(maxHabits);

      return (data || []) as Habit[];
    },
    staleTime: 60 * 1000,
  });

  // Fetch habit logs for current week
  const { data: habitLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['dashboard-habit-logs', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data } = await supabase
        .from('habit_logs')
        .select('habit_id, date, completed')
        .eq('user_id', session.user.id)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      return (data || []) as HabitLog[];
    },
    staleTime: 30 * 1000,
  });

  // Toggle habit mutation
  const toggleHabit = useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: Date }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const dateStr = format(date, 'yyyy-MM-dd');

      // Call the toggle_habit RPC function
      const { error } = await supabase.rpc('toggle_habit', {
        p_user_id: session.user.id,
        p_habit_id: habitId,
        p_date: dateStr,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-habit-logs'] });
    },
    onError: () => {
      toast.error('Failed to update habit');
    },
  });

  // Check if a habit is completed on a specific date
  const isHabitCompleted = (habitId: string, date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return habitLogs?.some(log => 
      log.habit_id === habitId && 
      log.date === dateStr && 
      log.completed
    ) ?? false;
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!habits || !habitLogs) return { todayCount: 0, todayTotal: 0, weekPercent: 0 };

    const todayStr = format(today, 'yyyy-MM-dd');
    const todayCompleted = habitLogs.filter(log => 
      log.date === todayStr && log.completed
    ).length;
    const todayTotal = habits.length;

    // Week stats (only count up to today)
    const daysUpToToday = weekDays.filter(d => !isFuture(d)).length;
    const expectedLogs = habits.length * daysUpToToday;
    const completedLogs = habitLogs.filter(log => log.completed).length;
    const weekPercent = expectedLogs > 0 ? Math.round((completedLogs / expectedLogs) * 100) : 0;

    return { todayCount: todayCompleted, todayTotal, weekPercent };
  }, [habits, habitLogs, today, weekDays]);

  const isLoading = habitsLoading || logsLoading;

  return (
    <WidgetSection title="Habits This Week" icon={<CheckCircle2 className="h-5 w-5" />}>
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}

      {!isLoading && (!habits || habits.length === 0) && (
        <div className="text-center py-4">
          <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-3">No active habits</p>
          <Button size="sm" asChild>
            <Link to="/habits">
              <Settings2 className="h-4 w-4 mr-2" />
              Set Up Habits
            </Link>
          </Button>
        </div>
      )}

      {!isLoading && habits && habits.length > 0 && (
        <div className="space-y-4">
          {/* Weekly Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-medium text-muted-foreground pb-2 pr-2 min-w-[80px]">
                    Habit
                  </th>
                  {weekDays.map((day) => (
                    <th 
                      key={day.toISOString()} 
                      className={cn(
                        "text-center font-medium pb-2 px-1 min-w-[32px]",
                        isToday(day) ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {format(day, 'EEE').charAt(0)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.slice(0, maxHabits).map((habit) => (
                  <tr key={habit.habit_id}>
                    <td className="py-1 pr-2">
                      <span className="truncate block max-w-[100px] md:max-w-[150px]" title={habit.habit_name}>
                        {habit.habit_name}
                      </span>
                    </td>
                    {weekDays.map((day) => {
                      const completed = isHabitCompleted(habit.habit_id, day);
                      const isFutureDay = isFuture(day);
                      const isTodayCell = isToday(day);

                      return (
                        <td key={day.toISOString()} className="text-center py-1 px-1">
                          <button
                            onClick={() => !isFutureDay && toggleHabit.mutate({ habitId: habit.habit_id, date: day })}
                            disabled={isFutureDay || toggleHabit.isPending}
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                              isFutureDay && "opacity-30 cursor-not-allowed",
                              !isFutureDay && "hover:bg-muted",
                              isTodayCell && "ring-2 ring-primary/30"
                            )}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats */}
          <div className="text-sm text-muted-foreground pt-2 border-t border-border">
            <span className="font-medium text-foreground">{stats.todayCount}/{stats.todayTotal}</span> habits today
            <span className="mx-2">•</span>
            <span className="font-medium text-foreground">{stats.weekPercent}%</span> this week
          </div>

          {/* Manage Link */}
          <Button variant="outline" size="sm" asChild>
            <Link to="/habits">
              <Settings2 className="h-4 w-4 mr-2" />
              Manage Habits
            </Link>
          </Button>
        </div>
      )}
    </WidgetSection>
  );
}
