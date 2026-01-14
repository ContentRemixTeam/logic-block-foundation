import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface WinEntry {
  text: string;
  captured_at: string;
  date: string;
}

export function WinsCard() {
  const { user } = useAuth();
  const [wins, setWins] = useState<WinEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRecentWins();
    }
  }, [user]);

  const loadRecentWins = async () => {
    try {
      // Fetch recent daily_plans with daily_wins
      const { data, error } = await supabase
        .from('daily_plans')
        .select('date, daily_wins')
        .eq('user_id', user?.id)
        .not('daily_wins', 'is', null)
        .order('date', { ascending: false })
        .limit(10); // Get last 10 days

      if (error) throw error;

      // Extract wins
      const allWins: WinEntry[] = [];
      data?.forEach((plan) => {
        const planWins = plan.daily_wins as unknown as Array<{ text: string; captured_at: string }>;
        if (Array.isArray(planWins)) {
          planWins.forEach((win) => {
            allWins.push({
              text: win.text,
              captured_at: win.captured_at,
              date: plan.date,
            });
          });
        }
      });

      // Sort by captured_at descending and take top 3
      allWins.sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());
      setWins(allWins.slice(0, 3));
    } catch (error) {
      console.error('Error loading wins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Count wins this month
  const winsThisMonth = wins.filter((win) => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const winDate = parseISO(win.date);
    return isWithinInterval(winDate, { start, end });
  }).length;

  if (loading) {
    return null; // Don't show while loading
  }

  if (wins.length === 0) {
    return null; // Don't show if no wins
  }

  return (
    <PremiumCard className="border-yellow-500/20">
      <PremiumCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <PremiumCardTitle className="text-lg">Recent Wins</PremiumCardTitle>
          </div>
          {wins.length > 0 && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {winsThisMonth} this month
            </span>
          )}
        </div>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-3">
          {wins.map((win, index) => (
            <div key={`${win.date}-${index}`} className="flex items-start gap-2">
              <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{win.text}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(win.date), 'MMM d')}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" asChild className="w-full mt-4">
          <Link to="/wins" className="flex items-center justify-center gap-2">
            View All Wins
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PremiumCardContent>
    </PremiumCard>
  );
}
