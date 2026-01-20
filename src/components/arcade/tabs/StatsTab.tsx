import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer, Egg, CheckSquare, Palette } from 'lucide-react';

interface Stats {
  tasksCompleted: number;
  focusSessionsCompleted: number;
  totalFocusMinutes: number;
  petsHatched: number;
}

export function StatsTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
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
  }, [user]);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading stats...</div>;
  }

  const statCards = [
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

  // Calculate progress toward theme unlock
  const tasksToTheme = Math.max(0, 50 - stats.tasksCompleted);
  const petsToTheme = Math.max(0, 10 - stats.petsHatched);

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
        
        {/* Theme unlock progress card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Theme Unlock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete tasks to unlock special themes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestone hints */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progress Milestones</CardTitle>
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
          {tasksToTheme > 0 && (
            <p className="flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Complete {tasksToTheme} more tasks to unlock a special theme!
            </p>
          )}
          {petsToTheme > 0 && tasksToTheme <= 0 && (
            <p className="flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Hatch {petsToTheme} more pets for another theme unlock!
            </p>
          )}
          {stats.tasksCompleted >= 50 && stats.petsHatched >= 10 && (
            <p className="text-primary font-medium">🎉 You're a productivity champion!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
