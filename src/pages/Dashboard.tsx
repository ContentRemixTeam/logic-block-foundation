import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { 
  Target, 
  Calendar, 
  CheckSquare, 
  ArrowRight, 
  TrendingUp, 
  Zap, 
  Map, 
  Compass,
  Sparkles,
  GraduationCap,
  Check
} from 'lucide-react';
import { OnboardingChecklist } from '@/components/tour/OnboardingChecklist';
import { QuestMapCompact } from '@/components/quest/QuestMap';
import { XPDisplay } from '@/components/quest/XPDisplay';
import { StreakDisplay } from '@/components/quest/StreakDisplay';
import { MastermindCallWidget } from '@/components/mastermind/MastermindCallWidget';
import { PodcastWidget } from '@/components/podcast/PodcastWidget';
import { HelpButton } from '@/components/ui/help-button';
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from '@/components/ui/premium-card';
import { TodayStrip, PlanMyWeekButton, QuickActionsPanel, ResourcesPanel } from '@/components/dashboard';

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
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        setError('Please log in to view your dashboard');
        setLoading(false);
        return;
      }
      
      const [dashboardData, ideasData] = await Promise.all([
        supabase.functions.invoke('get-dashboard-summary'),
        supabase.functions.invoke('get-ideas'),
      ]);

      if (dashboardData.error) {
        console.error('Function invocation error:', dashboardData.error);
        throw dashboardData.error;
      }
      
      const summaryData = dashboardData.data?.data || null;
      setSummary(summaryData);
      setIdeasCount(ideasData.data?.ideas?.length || 0);
      
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

  // Safe normalization
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
  const cycleProgress = daysRemaining > 0 ? Math.max(0, Math.min(100, ((90 - daysRemaining) / 90) * 100)) : 100;
  const currentDay = 90 - daysRemaining;
  const currentWeek = Math.ceil(currentDay / 7);

  // Get the top priority for TodayStrip
  const topPriority = weeklyPriorities[0] || todayTop3[0] || null;

  return (
    <Layout>
      <ReminderPopup reminders={thingsToRemember} onDismiss={() => {}} />
      <DebriefReminderPopup />
      
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="bp-h1 flex items-center gap-3">
            {isQuestMode ? (
              <Map className="h-8 w-8 text-primary" />
            ) : (
              <Zap className="h-8 w-8 text-primary" />
            )}
            {getNavLabel('dashboard')}
          </h1>
          <p className="text-foreground-muted mt-1">
            {isQuestMode ? 'Your adventure awaits, Boss' : 'Your 90-day Becoming Boss journey'}
          </p>
        </div>

        {/* Onboarding Checklist - Full Width */}
        <OnboardingChecklist />

        {/* Quest Mode XP & Streak */}
        {isQuestMode && hasCycle && (
          <div className="grid gap-4 md:grid-cols-2">
            <XPDisplay />
            <StreakDisplay />
          </div>
        )}

        {/* Welcome Card for New Users */}
        {!hasCycle ? (
          <PremiumCard category="plan">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1">
                  Welcome to the Becoming Boss Mastermind!
                </h2>
                <p className="text-foreground-muted mb-4">
                  Begin your journey by defining your 90-day goal, identity, and supporting projects.
                </p>
                <Link to="/cycle-setup">
                  <Button variant="premium" size="lg" className="gap-2">
                    <Zap className="h-5 w-5" />
                    Start Your First 90-Day Cycle
                  </Button>
                </Link>
              </div>
            </div>
          </PremiumCard>
        ) : (
          /* 2-Column Layout */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Main Content */}
            <div className="flex-1 space-y-6 max-w-3xl">
              {/* Today Strip */}
              <TodayStrip topPriority={topPriority} />

              {/* 90-Day Goal Card */}
              {goal && (
                <>
                  {isQuestMode ? (
                    <PremiumCard category="plan">
                      <QuestMapCompact
                        cycleGoal={goal}
                        currentDay={currentDay}
                        totalDays={90}
                        currentWeek={currentWeek}
                      />
                    </PremiumCard>
                  ) : (
                    <PremiumCard category="plan">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-foreground-muted" />
                            <span className="bp-label">90-DAY GOAL</span>
                            <HelpButton
                              title="90-Day Cycle"
                              description="Your 90-day cycle breaks down into weeks and days."
                              tips={[
                                "Set one clear goal for the entire 90 days",
                                "Weekly priorities support your main goal",
                                "Daily Top 3 tasks drive weekly progress"
                              ]}
                              learnMoreHref="/support"
                              size="sm"
                            />
                          </div>
                          <h2 className="text-2xl font-bold leading-tight mb-3">{goal}</h2>
                          {focusArea && (
                            <Badge className="bp-badge mb-3">
                              Focus: {focusArea}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground-muted">Progress</span>
                          <span className="font-semibold">{Math.round(cycleProgress)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-primary to-[hsl(330,81%,65%)] rounded-full h-2.5 transition-all duration-500"
                            style={{ width: `${cycleProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-foreground-muted">
                          {daysRemaining > 0 ? `${daysRemaining} days remaining` : (
                            <span className="flex items-center gap-1 text-success">
                              <Check className="h-4 w-4" /> Cycle complete!
                            </span>
                          )}
                        </p>
                      </div>
                    </PremiumCard>
                  )}
                </>
              )}

              {/* Weekly Priorities Card */}
              <PremiumCard category="plan">
                <PremiumCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle>This Week's Top 3</PremiumCardTitle>
                    </div>
                    <Link to="/weekly-plan">
                      <Button variant="ghost" size="sm" className="text-sm">
                        Edit <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </PremiumCardHeader>
                <PremiumCardContent>
                  {weeklyPriorities.length > 0 ? (
                    <div className="space-y-3">
                      {weeklyPriorities.map((priority, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-sm leading-relaxed">{priority}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Calendar className="h-10 w-10 text-foreground-muted/30 mx-auto mb-3" />
                      <p className="font-medium mb-1">Set your Weekly Top 3</p>
                      <p className="text-sm text-foreground-muted mb-4">
                        Focus on 3 priorities this week (2 min)
                      </p>
                      <Link to="/weekly-plan">
                        <Button>Set Weekly Priorities</Button>
                      </Link>
                    </div>
                  )}
                </PremiumCardContent>
              </PremiumCard>

              {/* Today's Top 3 Card */}
              <PremiumCard category="do">
                <PremiumCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle>Today's Top 3</PremiumCardTitle>
                    </div>
                    <Link to="/daily-plan">
                      <Button variant="ghost" size="sm" className="text-sm">
                        Edit <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </PremiumCardHeader>
                <PremiumCardContent>
                  {todayTop3.length > 0 ? (
                    <div className="space-y-3">
                      {todayTop3.map((task, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                          <div className="w-6 h-6 rounded-full bg-[hsl(173,80%,40%)]/10 text-[hsl(173,80%,40%)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-sm leading-relaxed">{task}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Target className="h-10 w-10 text-foreground-muted/30 mx-auto mb-3" />
                      <p className="font-medium mb-1">What are your Big 3 today?</p>
                      <p className="text-sm text-foreground-muted mb-4">
                        Choose 3 tasks that will move you forward (1 min)
                      </p>
                      <Link to="/daily-plan">
                        <Button>Plan Today</Button>
                      </Link>
                    </div>
                  )}
                </PremiumCardContent>
              </PremiumCard>

              {/* Habits Status Card */}
              <PremiumCard category="do">
                <PremiumCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle>Today's Habits</PremiumCardTitle>
                    </div>
                    <Link to="/habits">
                      <Button variant="ghost" size="sm" className="text-sm">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <div className="flex items-center gap-3">
                    {habitStatus === 'green' && (
                      <Badge className="bp-badge-success gap-1">
                        <Check className="h-3 w-3" /> Great progress
                      </Badge>
                    )}
                    {habitStatus === 'yellow' && (
                      <Badge className="bg-warning/10 text-warning border border-warning/20 rounded-full px-3 py-0.5 text-xs font-medium">
                        Needs work
                      </Badge>
                    )}
                    {habitStatus === 'grey' && (
                      <Badge className="bg-muted text-foreground-muted rounded-full px-3 py-0.5 text-xs font-medium">
                        Not started
                      </Badge>
                    )}
                  </div>
                </PremiumCardContent>
              </PremiumCard>

              {/* Reviews Section */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Weekly Review */}
                <PremiumCard category="review">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle className="text-base">Weekly Review</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent>
                    {weeklyReviewStatus.exists ? (
                      <div>
                        <Badge className="bp-badge-success gap-1">
                          <Check className="h-3 w-3" /> Completed
                        </Badge>
                        {weeklyReviewStatus.score !== null && (
                          <p className="text-2xl font-bold mt-2">Score: {weeklyReviewStatus.score}/10</p>
                        )}
                        <Link to="/weekly-review" className="mt-3 block">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View Review <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-foreground-muted mb-3">Reflect on your week</p>
                        <Link to="/weekly-review">
                          <Button variant="outline" size="sm">Complete Review</Button>
                        </Link>
                      </div>
                    )}
                  </PremiumCardContent>
                </PremiumCard>

                {/* Monthly Review */}
                <PremiumCard category="review">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle className="text-base">Monthly Review</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent>
                    {monthlyReviewStatus.exists ? (
                      <div>
                        <Badge className="bp-badge-success gap-1">
                          <Check className="h-3 w-3" /> Completed
                        </Badge>
                        {monthlyReviewStatus.score !== null && (
                          <p className="text-2xl font-bold mt-2">Score: {monthlyReviewStatus.score}/10</p>
                        )}
                        {monthlyReviewStatus.wins_count > 0 && (
                          <p className="text-xs text-foreground-muted mt-1">{monthlyReviewStatus.wins_count} wins recorded</p>
                        )}
                        <Link to="/monthly-review" className="mt-3 block">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View Review <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-foreground-muted mb-3">Reflect on the month</p>
                        <Link to="/monthly-review">
                          <Button variant="outline" size="sm">Complete Review</Button>
                        </Link>
                      </div>
                    )}
                  </PremiumCardContent>
                </PremiumCard>
              </div>

              {/* Cycle Summary (if complete) */}
              {cycleSummaryStatus.is_complete && (
                <PremiumCard category="review">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle>90-Day Summary</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent>
                    {cycleSummaryStatus.exists ? (
                      <div>
                        <Badge className="bp-badge-success gap-1">
                          <Check className="h-3 w-3" /> Completed
                        </Badge>
                        {cycleSummaryStatus.score !== null && (
                          <p className="text-2xl font-bold mt-2">Score: {cycleSummaryStatus.score}/10</p>
                        )}
                        {cycleSummaryStatus.wins_count > 0 && (
                          <p className="text-xs text-foreground-muted mt-1">{cycleSummaryStatus.wins_count} overall wins</p>
                        )}
                        <Link to="/cycle-summary" className="mt-3 block">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View Summary <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-foreground-muted mb-3">Cycle complete - time to reflect</p>
                        <Link to="/cycle-summary">
                          <Button variant="outline" size="sm">Complete Summary</Button>
                        </Link>
                      </div>
                    )}
                  </PremiumCardContent>
                </PremiumCard>
              )}
            </div>

            {/* Right Rail - Sticky Sidebar */}
            <div className="lg:w-80 space-y-4 lg:sticky lg:top-20 lg:h-fit">
              {/* Plan My Week Button */}
              <PlanMyWeekButton />

              {/* Mastermind Call Widget */}
              <MastermindCallWidget />

              {/* Podcast Widget */}
              <PodcastWidget />

              {/* Quick Actions */}
              <QuickActionsPanel ideasCount={ideasCount} />

              {/* Resources */}
              <ResourcesPanel />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
