import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, Gamepad2, Timer, Egg } from 'lucide-react';

interface Stats {
  totalCoinsEarned: number;
  gamesPlayed: number;
  focusSessionsCompleted: number;
  totalFocusMinutes: number;
  petsHatched: number;
}

export function StatsTab() {
  const { user } = useAuth();
  const { wallet } = useArcade();
  const [stats, setStats] = useState<Stats>({
    totalCoinsEarned: 0,
    gamesPlayed: 0,
    focusSessionsCompleted: 0,
    totalFocusMinutes: 0,
    petsHatched: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        // Get games played count
        const { count: gamesCount } = await supabase
          .from('arcade_game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get pomodoro sessions completed
        const { data: pomodoroData } = await supabase
          .from('arcade_pomodoro_sessions')
          .select('focus_minutes')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        const focusSessions = pomodoroData?.length || 0;
        const totalMinutes = pomodoroData?.reduce((sum, s) => sum + (s.focus_minutes || 0), 0) || 0;

        // Get pets hatched count
        const { count: petsCount } = await supabase
          .from('arcade_daily_pet')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('stage', 'hatched');

        setStats({
          totalCoinsEarned: wallet.total_coins_earned,
          gamesPlayed: gamesCount || 0,
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
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Games Played',
      value: stats.gamesPlayed,
      icon: Gamepad2,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Focus Sessions',
      value: stats.focusSessionsCompleted,
      icon: Timer,
      color: 'text-red-600 dark:text-red-400',
      subtitle: stats.totalFocusMinutes > 0 ? `${Math.round(stats.totalFocusMinutes / 60)} hours total` : undefined,
    },
    {
      title: 'Pets Hatched',
      value: stats.petsHatched,
      icon: Egg,
      color: 'text-green-600 dark:text-green-400',
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
          {stats.totalCoinsEarned < 50 && (
            <p>🎮 Earn {50 - stats.totalCoinsEarned} more coins to unlock Focus Challenge</p>
          )}
          {stats.totalCoinsEarned < 100 && (
            <p>🎮 Earn {100 - stats.totalCoinsEarned} more coins to unlock Pattern Pro</p>
          )}
          {stats.petsHatched < 5 && (
            <p>🥚 Hatch {5 - stats.petsHatched} more pets to become a Pet Master</p>
          )}
          {stats.focusSessionsCompleted < 10 && (
            <p>🍅 Complete {10 - stats.focusSessionsCompleted} more focus sessions</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
