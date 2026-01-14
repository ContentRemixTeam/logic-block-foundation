import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';

interface WinEntry {
  text: string;
  captured_at: string;
  date: string; // The date of the daily plan
}

export default function Wins() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wins, setWins] = useState<WinEntry[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('this-month');

  useEffect(() => {
    if (user) {
      loadWins();
    }
  }, [user]);

  const loadWins = async () => {
    try {
      setLoading(true);

      // Fetch daily_plans with daily_wins
      const { data, error } = await supabase
        .from('daily_plans')
        .select('date, daily_wins')
        .eq('user_id', user?.id)
        .not('daily_wins', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;

      // Extract wins from daily_plans
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

      // Sort by captured_at descending
      allWins.sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());
      setWins(allWins);
    } catch (error) {
      console.error('Error loading wins:', error);
      toast({ title: 'Failed to load wins', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter wins by date range
  const filteredWins = useMemo(() => {
    const now = new Date();
    
    if (dateFilter === 'all') {
      return wins;
    }
    
    let startDate: Date;
    let endDate = endOfMonth(now);

    switch (dateFilter) {
      case 'this-month':
        startDate = startOfMonth(now);
        break;
      case 'last-month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'last-3-months':
        startDate = startOfMonth(subMonths(now, 2));
        break;
      default:
        startDate = startOfMonth(now);
    }

    return wins.filter((win) => {
      const winDate = parseISO(win.date);
      return isWithinInterval(winDate, { start: startDate, end: endDate });
    });
  }, [wins, dateFilter]);

  const winsThisMonth = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return wins.filter((win) => {
      const winDate = parseISO(win.date);
      return isWithinInterval(winDate, { start, end });
    }).length;
  }, [wins]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Your Wins
            </h1>
            <p className="text-muted-foreground">
              Celebrate your progress! All wins captured from your daily scratch pad.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/daily-plan')}>
              Daily Plan
            </Button>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{winsThisMonth} wins this month</p>
                  <p className="text-muted-foreground">{wins.length} total wins captured</p>
                </div>
              </div>
              <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                Keep going! 🔥
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Showing {filteredWins.length} wins
          </span>
        </div>

        {/* Wins List */}
        {filteredWins.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No wins captured yet</h3>
              <p className="text-muted-foreground mb-4">
                Use #win in your daily scratch pad to capture wins as they happen!
              </p>
              <Button onClick={() => navigate('/daily-plan')}>
                Go to Daily Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredWins.map((win, index) => (
              <Card key={`${win.date}-${index}`} className="hover:border-yellow-500/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="font-medium">{win.text}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(win.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tip Card */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Use <code className="bg-muted px-1 rounded">#win</code> in your 
              daily scratch pad to capture wins in the moment. They'll automatically appear here!
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
