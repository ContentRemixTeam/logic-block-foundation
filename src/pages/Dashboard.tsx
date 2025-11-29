import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Target, Calendar, CheckSquare, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardSummary();
  }, [user]);

  const loadDashboardSummary = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setSummary(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  const hasCycle = summary?.cycle?.goal;
  const habitColor = summary?.habits?.status || 'grey';

  const colorClasses = {
    green: 'bg-success/10 text-success',
    yellow: 'bg-warning/10 text-warning',
    grey: 'bg-muted text-muted-foreground',
  };

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
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Start your 90-day cycle to unlock your planning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/onboarding">
                <Button>Start Onboarding</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 90-Day Goal */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">90-Day Goal</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.cycle.goal}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.cycle.days_remaining} days remaining
                </p>
              </CardContent>
            </Card>

            {/* Weekly Priorities */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {summary.week.priorities.length > 0 ? (
                    summary.week.priorities.map((priority: string, idx: number) => (
                      <div key={idx} className="text-sm">
                        {priority}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No priorities set
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Habits */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Habits</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${colorClasses[habitColor as keyof typeof colorClasses]}`}
                >
                  {habitColor === 'green' && '✓ Great progress'}
                  {habitColor === 'yellow' && '~ Needs work'}
                  {habitColor === 'grey' && '○ Not started'}
                </div>
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
