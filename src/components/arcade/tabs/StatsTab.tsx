import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Timer, Egg, CheckSquare } from 'lucide-react';

interface Stats {
  totalCoinsEarned: number;
  tasksCompleted: number;
  focusSessionsCompleted: number;
  totalFocusMinutes: number;
  petsHatched: number;
}

export function StatsTab() {
  const { user } = useAuth();
  const { wallet } = useArcade();
  const [stats, setStats] = useState<Stats>({
    totalCoinsEarned: 0,
    tasksCompleted: 0,
    focusSessionsCompleted: 0,
    totalFocusMinutes: 0,
    petsHatched: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        // Get tasks completed (from arcade events)
        const { count: tasksCount } = await supabase
          .from('arcade_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('event_type', 'task_completed');

        // Get pomodoro sessions completed
        const { data: pomodoroData } = await supabase
          .from('arcade_pomodoro_sessions')
          .select('focus_minutes')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        const focusSessions = pomodoroData?.length || 0;
        const totalMinutes = pomodoroData?.reduce((sum, s) => sum + (s.focus_minutes || 0), 0) || 0;

        // Get total pets hatched (from hatched_pets table)
        const { count: petsCount } = await supabase
          .from('hatched_pets')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setStats({
          totalCoinsEarned: wallet.total_coins_earned,
          tasksCompleted: tasksCount || 0,
          focusSessionsCompleted: focusSessions,
          totalFocusMinutes: totalMinutes,
          petsHatched: petsCount || 0,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
      
      setIsLoading(false);
    };

    loadStats();
  }, [user, wallet.total_coins_earned]);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading stats...</div>;
  }

  const statCards = [
    {
      title: 'Total Coins Earned',
      value: stats.totalCoinsEarned,
      icon: Coins,
      color: 'text-warning',
    },
    {
      title: 'Tasks Completed',
      value: stats.tasksCompleted,
      icon: CheckSquare,
      color: 'text-primary',
    },
    {
      title: 'Focus Sessions',
      value: stats.focusSessionsCompleted,
      icon: Timer,
      color: 'text-destructive',
      subtitle: stats.totalFocusMinutes > 0 ? `${Math.round(stats.totalFocusMinutes / 60)} hours total` : undefined,
    },
    {
      title: 'Pets Hatched',
      value: stats.petsHatched,
      icon: Egg,
      color: 'text-success',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {statCards.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Milestone hints */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Next Milestones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {stats.petsHatched < 5 && (
            <p>🥚 Hatch {5 - stats.petsHatched} more pets to become a Pet Master</p>
          )}
          {stats.petsHatched >= 5 && stats.petsHatched < 10 && (
            <p>🥚 Hatch {10 - stats.petsHatched} more pets to become a Pet Legend</p>
          )}
          {stats.focusSessionsCompleted < 10 && (
            <p>🍅 Complete {10 - stats.focusSessionsCompleted} more focus sessions</p>
          )}
          {stats.tasksCompleted < 30 && (
            <p>✅ Complete {30 - stats.tasksCompleted} more tasks for Task Champion</p>
          )}
          {stats.totalCoinsEarned < 100 && (
            <p>🪙 Earn {100 - stats.totalCoinsEarned} more coins to reach 100!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
