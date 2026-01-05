import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { ReminderPopup } from '@/components/ReminderPopup';
import { DebriefReminderPopup } from '@/components/DebriefReminderPopup';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { normalizeArray, normalizeString, normalizeNumber } from '@/lib/normalize';
import { Target, Calendar, CheckSquare, ArrowRight, TrendingUp, Zap, Map, Compass, Swords } from 'lucide-react';
import { OnboardingChecklist } from '@/components/tour/OnboardingChecklist';
import { QuestMapCompact } from '@/components/quest/QuestMap';
import { XPDisplay } from '@/components/quest/XPDisplay';
import { StreakDisplay } from '@/components/quest/StreakDisplay';
import { MastermindCallWidget } from '@/components/mastermind/MastermindCallWidget';

export default function Dashboard() {
  const { user } = useAuth();
  const { isQuestMode, getNavLabel } = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ideasCount, setIdeasCount] = useState(0);
  const [thingsToRemember, setThingsToRemember] = useState<string[]>([]);

  useEffect(() => {
    loadDashboardSummary();
  }, [user]);

  const loadDashboardSummary = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('Loading dashboard summary...');
      
      const [dashboardData, ideasData] = await Promise.all([
        supabase.functions.invoke('get-dashboard-summary'),
        supabase.functions.invoke('get-ideas'),
      ]);

      console.log('Dashboard response:', { 
        hasData: Boolean(dashboardData.data),
        dataKeys: dashboardData.data ? Object.keys(dashboardData.data) : [],
        error: dashboardData.error 
      });

      if (dashboardData.error) {
        console.error('Function invocation error:', dashboardData.error);
        throw dashboardData.error;
      }
      
      console.log('Dashboard data received:', dashboardData.data);
      const summaryData = dashboardData.data?.data || null;
      setSummary(summaryData);
      setIdeasCount(ideasData.data?.ideas?.length || 0);
      
      // Extract things to remember from the cycle
      if (summaryData?.cycle?.things_to_remember) {
        const reminders = Array.isArray(summaryData.cycle.things_to_remember) 
          ? summaryData.cycle.things_to_remember.filter((r: string) => r && r.trim())
          : [];
        setThingsToRemember(reminders);
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      setError(error?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading your dashboard..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorState
          title="Unable to Load Dashboard"
          message={error}
          onRetry={loadDashboardSummary}
          showDashboard={false}
        />
      </Layout>
    );
  }

  // Safe normalization using utility functions
  const cycle = summary?.cycle ?? {};
  const week = summary?.week ?? {};
  const today = summary?.today ?? {};
  const habits = summary?.habits ?? {};
  const weeklyReviewStatus = summary?.weekly_review_status ?? { exists: false, score: null };
  const monthlyReviewStatus = summary?.monthly_review_status ?? { exists: false, score: null, wins_count: 0 };
  const cycleSummaryStatus = summary?.cycle_summary_status ?? { exists: false, is_complete: false, score: null, wins_count: 0 };

  const weeklyPriorities = normalizeArray(week.priorities);
  const todayTop3 = normalizeArray(today.top_3);
  const goal = normalizeString(cycle.goal);
  const daysRemaining = normalizeNumber(cycle.days_remaining);
  const focusArea = normalizeString(cycle.focus_area);
  const habitStatus = (normalizeString(habits.status, 'grey')) as 'green' | 'yellow' | 'grey';
  
  const hasCycle = Boolean(goal);
  
  // Calculate progress percentage
  const cycleProgress = daysRemaining > 0 ? Math.max(0, Math.min(100, ((90 - daysRemaining) / 90) * 100)) : 100;
  const currentDay = 90 - daysRemaining;
  const currentWeek = Math.ceil(currentDay / 7);

  return (
    <Layout>
      <ReminderPopup reminders={thingsToRemember} onDismiss={() => {}} />
      <DebriefReminderPopup />
      <div className="space-y-8">
        <div>
          <h1 
            className="text-3xl font-bold flex items-center gap-2"
            style={{ fontFamily: isQuestMode ? 'var(--font-heading)' : 'inherit' }}
          >
            {isQuestMode ? <Map className="h-8 w-8 text-primary" /> : <span>⚡</span>}
            {getNavLabel('dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {isQuestMode ? 'Your adventure awaits, adventurer' : 'Your 90-day planning overview'}
          </p>
        </div>

        {/* Quest Mode XP & Streak Display */}
        {isQuestMode && hasCycle && (
          <div className="grid gap-4 md:grid-cols-2">
            <XPDisplay />
            <StreakDisplay />
          </div>
        )}

        {/* Mastermind Call Widget */}
        {hasCycle && (
          <MastermindCallWidget />
        )}

        {/* Onboarding Checklist */}
        <OnboardingChecklist />

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
            {/* Quest Map / 90-Day Goal */}
            {goal && (
              <>
                {isQuestMode ? (
                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardContent className="pt-6">
                      <QuestMapCompact
                        cycleGoal={goal}
                        currentDay={currentDay}
                        totalDays={90}
                        currentWeek={currentWeek}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 to-accent/10">
                      <CardTitle className="text-sm font-medium flex items-center gap-1">
                        <span>⚡</span>
                        90-Day Goal
                      </CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold line-clamp-2 mb-3">{goal}</div>
                      {focusArea && (
                        <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                          Focus: {focusArea}
                        </Badge>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{Math.round(cycleProgress)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${cycleProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Cycle complete! 🎉'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
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
                     {habitStatus === 'green' && '⚡ Great progress'}
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

            {/* Weekly Review Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Review</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {weeklyReviewStatus.exists ? (
                  <div>
                    <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20">
                      ✓ Completed
                    </Badge>
                    {weeklyReviewStatus.score !== null && (
                      <p className="text-2xl font-bold mt-2">Score: {weeklyReviewStatus.score}/10</p>
                    )}
                    <Link to="/weekly-review" className="mt-3 block">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        View Review →
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No review yet</p>
                    <Link to="/weekly-review">
                      <Button variant="outline" size="sm">Complete Review</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Review */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Review</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {monthlyReviewStatus.exists ? (
                  <div>
                    <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20">
                      ✓ Completed
                    </Badge>
                    {monthlyReviewStatus.score !== null && (
                      <p className="text-2xl font-bold mt-2">Score: {monthlyReviewStatus.score}/10</p>
                    )}
                    {monthlyReviewStatus.wins_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{monthlyReviewStatus.wins_count} wins recorded</p>
                    )}
                    <Link to="/monthly-review" className="mt-3 block">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        View Review →
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Reflect on the month</p>
                    <Link to="/monthly-review">
                      <Button variant="outline" size="sm">Complete Review</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cycle Summary */}
            {cycleSummaryStatus.is_complete && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">90-Day Summary</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {cycleSummaryStatus.exists ? (
                    <div>
                      <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20">
                        ✓ Completed
                      </Badge>
                      {cycleSummaryStatus.score !== null && (
                        <p className="text-2xl font-bold mt-2">Score: {cycleSummaryStatus.score}/10</p>
                      )}
                      {cycleSummaryStatus.wins_count > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{cycleSummaryStatus.wins_count} overall wins</p>
                      )}
                      <Link to="/cycle-summary" className="mt-3 block">
                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                          View Summary →
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Cycle complete - time to reflect</p>
                      <Link to="/cycle-summary">
                        <Button variant="outline" size="sm">Complete Summary</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
            <Link to="/weekly-review">
              <Card className="cursor-pointer transition-colors hover:bg-secondary">
                <CardContent className="flex items-center justify-between p-6">
                  <span className="font-medium">Weekly Review</span>
                  <ArrowRight className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/monthly-review">
              <Card className="cursor-pointer transition-colors hover:bg-secondary">
                <CardContent className="flex items-center justify-between p-6">
                  <span className="font-medium">Monthly Review</span>
                  <ArrowRight className="h-4 w-4" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/ideas">
              <Card className="cursor-pointer transition-colors hover:bg-secondary">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <span className="font-medium">Captured Ideas ({ideasCount})</span>
                  </div>
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
