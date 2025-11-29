import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Target, Calendar, CheckSquare, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardSummary();
  }, [user]);

  const loadDashboardSummary = async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('Loading dashboard summary...');
      
      const { data, error: fnError } = await supabase.functions.invoke('get-dashboard-summary');

      console.log('Dashboard response:', { 
        hasData: Boolean(data),
        dataKeys: data ? Object.keys(data) : [],
        error: fnError 
      });

      if (fnError) {
        console.error('Function invocation error:', fnError);
        throw fnError;
      }
      
      console.log('Dashboard data received:', data);
      setSummary(data?.data || null);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      setError(error?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Unable to Load Dashboard</CardTitle>
              <CardDescription>
                We encountered an issue loading your dashboard data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This might be temporary. Please try refreshing the page or starting a new 90-day cycle.
              </p>
              <div className="flex gap-2">
                <Button onClick={loadDashboardSummary} variant="default">
                  Retry
                </Button>
                <Link to="/cycle-setup">
                  <Button variant="outline">Start New Cycle</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Safe normalization of all data with fallbacks
  const cycle = summary?.cycle ?? {};
  const week = summary?.week ?? {};
  const today = summary?.today ?? {};
  const habits = summary?.habits ?? {};

  // Fallback arrays for priorities
  const weeklyPriorities = Array.isArray(week.priorities)
    ? week.priorities.map(String).filter(Boolean)
    : [];

  const todayTop3 = Array.isArray(today.top_3)
    ? today.top_3.map(String).filter(Boolean)
    : [];

  // Fallback strings and numbers
  const goal = cycle.goal ?? '';
  const daysRemaining = cycle.days_remaining ?? 0;
  const habitStatus = (habits.status ?? 'grey') as 'green' | 'yellow' | 'grey';
  
  const hasCycle = Boolean(goal);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your 90-day planning overview</p>
        </div>

        {!hasCycle ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome! Start Your First 90-Day Cycle</CardTitle>
              <CardDescription>
                Begin your journey by defining your 90-day goal, identity, and supporting projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A 90-day cycle helps you focus on what matters most and make consistent progress toward your goals.
              </p>
              <Link to="/cycle-setup">
                <Button size="lg">Start Your First 90-Day Cycle</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 90-Day Goal */}
            {goal && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">90-Day Goal</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold line-clamp-2">{goal}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Cycle complete'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Weekly Priorities */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week's Top 3</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyPriorities.length > 0 ? (
                    weeklyPriorities.map((priority, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <div className="text-sm line-clamp-2">{priority}</div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">No weekly plan yet</p>
                      <Link to="/weekly-plan">
                        <Button variant="outline" size="sm">Create Weekly Plan</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Today's Top 3 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Top 3</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayTop3.length > 0 ? (
                    todayTop3.map((task, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <div className="text-sm line-clamp-2">{task}</div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">No daily plan yet</p>
                      <Link to="/daily-plan">
                        <Button variant="outline" size="sm">Start Today's Plan</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Habits Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Habits</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={habitStatus === 'green' ? 'default' : habitStatus === 'yellow' ? 'secondary' : 'outline'}
                    className={`${
                      habitStatus === 'green'
                        ? 'bg-success/10 text-success hover:bg-success/20 border-success/20'
                        : habitStatus === 'yellow'
                        ? 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {habitStatus === 'green' && '✓ Great progress'}
                    {habitStatus === 'yellow' && '~ Needs work'}
                    {habitStatus === 'grey' && '○ Not started'}
                  </Badge>
                </div>
                <Link to="/habits" className="mt-3 block">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    View All Habits →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/daily-plan">
              <Card className="cursor-pointer transition-colors hover:bg-secondary">
                <CardContent className="flex items-center justify-between p-6">
                  <span className="font-medium">Start Today's Plan</span>
                  <ArrowRight className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/habits">
              <Card className="cursor-pointer transition-colors hover:bg-secondary">
                <CardContent className="flex items-center justify-between p-6">
                  <span className="font-medium">Track Habits</span>
                  <ArrowRight className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/weekly-plan">
              <Card className="cursor-pointer transition-colors hover:bg-secondary">
                <CardContent className="flex items-center justify-between p-6">
                  <span className="font-medium">Weekly Plan</span>
                  <ArrowRight className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/ideas">
              <Card className="cursor-pointer transition-colors hover:bg-secondary">
                <CardContent className="flex items-center justify-between p-6">
                  <span className="font-medium">Capture Ideas</span>
                  <ArrowRight className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Resources */}
        {hasCycle && (
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="#"
                className="block text-sm text-primary hover:underline"
                target="_blank"
              >
                Join Mastermind Group →
              </a>
              <a
                href="#"
                className="block text-sm text-primary hover:underline"
                target="_blank"
              >
                Coworking Sessions →
              </a>
              <a
                href="#"
                className="block text-sm text-primary hover:underline"
                target="_blank"
              >
                Calendar & Events →
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
