import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { ReminderPopup } from '@/components/ReminderPopup';
import { DebriefReminderPopup } from '@/components/DebriefReminderPopup';
import { OfficeHoursDisplay } from '@/components/OfficeHoursDisplay';
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
  Check,
  DollarSign,
  Brain,
  Lightbulb,
  Search,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { OnboardingChecklist } from '@/components/tour/OnboardingChecklist';
import { QuestMapCompact } from '@/components/quest/QuestMap';
import { XPDisplay } from '@/components/quest/XPDisplay';
import { StreakDisplay } from '@/components/quest/StreakDisplay';
import { MastermindCallWidget } from '@/components/mastermind/MastermindCallWidget';
import { PodcastWidget } from '@/components/podcast/PodcastWidget';
import { HelpButton } from '@/components/ui/help-button';
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from '@/components/ui/premium-card';
import { TodayStrip, PlanMyWeekButton, QuickActionsPanel, ResourcesPanel, MetricsWidget, WeeklyRoutineReminder, PromotionCountdown, SalesCalendar, First3DaysChecklist, getFirst3DaysCheckedState, saveFirst3DaysCheckedState } from '@/components/dashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { isQuestMode, getNavLabel } = useTheme();
  const { toast } = useToast();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingForData, setCheckingForData] = useState(false);
  const [ideasCount, setIdeasCount] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftStep, setDraftStep] = useState(0);
  const [thingsToRemember, setThingsToRemember] = useState<string[]>([]);
  const [revenueGoal, setRevenueGoal] = useState<number | null>(null);
  const [diagnosticScores, setDiagnosticScores] = useState<{ discover: number | null; nurture: number | null; convert: number | null } | null>(null);
  const [identityData, setIdentityData] = useState<{ identity: string | null; why: string | null; feeling: string | null } | null>(null);
  const [audienceData, setAudienceData] = useState<{ target: string | null; frustration: string | null; message: string | null } | null>(null);
  const [officeHoursData, setOfficeHoursData] = useState<{ start: string | null; end: string | null; days: string[] | null }>({ start: null, end: null, days: null });
  const [metricsData, setMetricsData] = useState<{ metric1_name: string | null; metric1_start: number | null; metric2_name: string | null; metric2_start: number | null; metric3_name: string | null; metric3_start: number | null } | null>(null);
  const [weeklyRoutines, setWeeklyRoutines] = useState<{ planning_day: string | null; debrief_day: string | null }>({ planning_day: null, debrief_day: null });
  const [first3DaysData, setFirst3DaysData] = useState<{ startDate: string | null; day1Top3: string[]; day2Top3: string[]; day3Top3: string[] } | null>(null);
  const [first3DaysChecked, setFirst3DaysChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDashboardSummary();
  }, [user]);

  const loadDashboardSummary = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('✅ Starting dashboard load for user:', user.id);
      
      // Step 1: Verify session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        console.error('❌ Session validation failed:', sessionError);
        setError('Your session has expired. Please refresh the page to log in again.');
        setLoading(false);
        return;
      }
      console.log('✅ Session validated');
      
      // Step 2: Call edge functions
      const [dashboardData, ideasData] = await Promise.all([
        supabase.functions.invoke('get-dashboard-summary'),
        supabase.functions.invoke('get-ideas'),
      ]);

      console.log('✅ Edge function response:', { 
        hasData: !!dashboardData.data, 
        hasError: !!dashboardData.error,
        cycleGoal: dashboardData.data?.data?.cycle?.goal 
      });

      if (dashboardData.error) {
        console.error('❌ Dashboard edge function error:', dashboardData.error);
        throw new Error('Unable to load your dashboard. Please try refreshing the page.');
      }
      
      const summaryData = dashboardData.data?.data || null;
      
      // Step 3: FALLBACK - If no cycle data from edge function, query directly
      if (!summaryData?.cycle?.goal) {
        console.log('⚠️ No cycle from edge function, trying direct query...');
        
        const { data: directCycle, error: directError } = await supabase
          .from('cycles_90_day')
          .select('cycle_id, goal, start_date, end_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        console.log('🔍 Direct cycle query result:', { directCycle, directError });
        
        if (directCycle && directCycle.goal) {
          console.log('✅ Found cycle via direct query, reloading...');
          toast({
            title: "Data sync issue detected",
            description: "Refreshing to load your data correctly...",
            duration: 2000,
          });
          setTimeout(() => window.location.reload(), 1000);
          return;
        }
        
        // No cycle found - check for drafts
        console.log('🔍 No cycle found, checking for drafts...');
        const { data: draftData } = await supabase
          .from('cycle_drafts')
          .select('current_step, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (draftData && draftData.current_step && draftData.current_step > 1) {
          console.log('✅ Found draft at step:', draftData.current_step);
          setHasDraft(true);
          setDraftStep(draftData.current_step);
        }
      }
      
      setSummary(summaryData);
      setIdeasCount(ideasData.data?.ideas?.length || 0);
      
      if (summaryData?.cycle?.things_to_remember) {
        const reminders = Array.isArray(summaryData.cycle.things_to_remember) 
          ? summaryData.cycle.things_to_remember.filter((r: string) => r && r.trim())
          : [];
        setThingsToRemember(reminders);
      }
      
      // Set revenue goal
      if (summaryData?.revenue?.goal) {
        setRevenueGoal(summaryData.revenue.goal);
      }
      
      // Set diagnostic scores
      if (summaryData?.cycle?.diagnostic_scores) {
        setDiagnosticScores(summaryData.cycle.diagnostic_scores);
      }
      
      // Set identity data
      if (summaryData?.cycle?.identity_data) {
        setIdentityData(summaryData.cycle.identity_data);
      }
      
      // Set audience data
      if (summaryData?.cycle?.audience_data) {
        setAudienceData(summaryData.cycle.audience_data);
      }
      
      // Set office hours data
      if (summaryData?.cycle) {
        setOfficeHoursData({
          start: summaryData.cycle.office_hours_start || null,
          end: summaryData.cycle.office_hours_end || null,
          days: summaryData.cycle.office_hours_days || null,
        });
        
        // Set weekly routines
        setWeeklyRoutines({
          planning_day: summaryData.cycle.weekly_planning_day || null,
          debrief_day: summaryData.cycle.weekly_debrief_day || null,
        });
      }
      
      // Set metrics data
      if (summaryData?.metrics) {
        setMetricsData(summaryData.metrics);
      }
      
      // Set first 3 days data for new cycle checklist
      if (summaryData?.first_3_days) {
        setFirst3DaysData({
          startDate: summaryData.first_3_days.start_date || null,
          day1Top3: Array.isArray(summaryData.first_3_days.day1_top3) ? summaryData.first_3_days.day1_top3 : [],
          day2Top3: Array.isArray(summaryData.first_3_days.day2_top3) ? summaryData.first_3_days.day2_top3 : [],
          day3Top3: Array.isArray(summaryData.first_3_days.day3_top3) ? summaryData.first_3_days.day3_top3 : [],
        });
        // Load checked state from localStorage
        setFirst3DaysChecked(getFirst3DaysCheckedState());
      }
    } catch (error: any) {
      console.error('❌ Dashboard load error:', error);
      setError(error?.message || 'Unable to load your dashboard. Please refresh the page or contact support if this persists.');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Handler for "Check for Lost Data" button
  const handleCheckForLostData = async () => {
    if (!user) return;
    
    setCheckingForData(true);
    console.log('🔍 Checking for lost cycle data...');
    
    try {
      // Verify session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        console.error('❌ Session validation failed:', sessionError);
        toast({
          title: "Session Expired",
          description: "Please refresh the page and log in again.",
          variant: "destructive",
          duration: 10000,
        });
        return;
      }
      
      // Direct query to cycles_90_day, bypassing edge function
      const { data: cycles, error } = await supabase
        .from('cycles_90_day')
        .select('cycle_id, goal, start_date, end_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('🔍 Direct cycle query result:', { cycles, error });
      
      if (error) {
        console.error('❌ Direct query failed:', error);
        toast({
          title: "Unable to check for data",
          description: "Please try refreshing the page. If this persists, contact support.",
          variant: "destructive",
          duration: 10000,
        });
        return;
      }
      
      if (cycles && cycles.length > 0) {
        console.log('✅ Found cycle data:', cycles[0]);
        toast({
          title: "✅ Data found!",
          description: `Found your cycle: "${cycles[0].goal?.substring(0, 50)}..." - Refreshing page...`,
          duration: 3000,
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        // No cycle found - check for drafts
        console.log('ℹ️ No cycle data found, checking for drafts...');
        
        const { data: draftData, error: draftError } = await supabase
          .from('cycle_drafts')
          .select('current_step, updated_at, draft_data')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (draftData && draftData.current_step && draftData.current_step > 1) {
          console.log('✅ Found draft at step:', draftData.current_step);
          setHasDraft(true);
          setDraftStep(draftData.current_step);
          toast({
            title: "📝 Found your saved progress!",
            description: `You have a cycle setup draft at step ${draftData.current_step}. Click "Resume" to continue where you left off.`,
            duration: 8000,
          });
        } else {
          console.log('ℹ️ No draft data found either');
          toast({
            title: "No saved data found",
            description: "It looks like no 90-day cycle has been saved yet. Please create one using the button above.",
            variant: "destructive",
            duration: 10000,
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Check for data failed:', error);
      toast({
        title: "Check failed",
        description: "An unexpected error occurred. Please try refreshing the page.",
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setCheckingForData(false);
    }
  };

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

  // Handler for First 3 Days checklist
  const handleFirst3DaysCheck = (key: string, checked: boolean) => {
    const newChecked = { ...first3DaysChecked, [key]: checked };
    setFirst3DaysChecked(newChecked);
    saveFirst3DaysCheckedState(newChecked);
  };

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
                  {hasDraft 
                    ? `You have a saved draft at step ${draftStep}. Continue where you left off!`
                    : 'Begin your journey by defining your 90-day goal, identity, and supporting projects.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/cycle-setup">
                    <Button variant="premium" size="lg" className="gap-2">
                      <Zap className="h-5 w-5" />
                      {hasDraft ? `Resume Your Cycle Setup (Step ${draftStep})` : 'Start Your First 90-Day Cycle'}
                    </Button>
                  </Link>
                </div>
                
                {/* Data Recovery Button */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground gap-2"
                    onClick={handleCheckForLostData}
                    disabled={checkingForData}
                  >
                    {checkingForData ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {checkingForData ? 'Checking...' : "Can't see your data? Click here to check"}
                  </Button>
                </div>
              </div>
            </div>
          </PremiumCard>
        ) : (
          /* 2-Column Layout */
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Main Content */}
            <div className="flex-1 space-y-6 max-w-3xl">
              {/* Today Strip */}
              <TodayStrip 
                topPriority={topPriority} 
                officeHoursStart={officeHoursData.start}
                officeHoursEnd={officeHoursData.end}
                officeHoursDays={officeHoursData.days}
              />

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

              {/* Your First 3 Days Checklist - Only shows in first 5 days */}
              {first3DaysData && (
                <First3DaysChecklist
                  data={first3DaysData}
                  daysRemaining={daysRemaining}
                  checkedState={first3DaysChecked}
                  onCheckChange={handleFirst3DaysCheck}
                />
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
              {/* Weekly Routine Reminder */}
              <WeeklyRoutineReminder 
                weeklyPlanningDay={weeklyRoutines.planning_day}
                weeklyDebriefDay={weeklyRoutines.debrief_day}
              />
              
              {/* Promotion Countdown - Priority placement */}
              <PromotionCountdown />
              
              {/* Sales Calendar */}
              <SalesCalendar />
              
              {/* Plan My Week Button */}
              <PlanMyWeekButton />
              
              {/* Success Metrics Widget */}
              <MetricsWidget metrics={metricsData} />

              {/* Revenue Goal Tracker */}
              {revenueGoal && (
                <PremiumCard category="do">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle className="text-base">90-Day Revenue Goal</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-muted">Target</span>
                        <span className="font-bold text-lg">${revenueGoal.toLocaleString()}</span>
                      </div>
                      <Progress value={0} className="h-2" />
                      <p className="text-xs text-foreground-muted">Track progress in your weekly reviews</p>
                    </div>
                  </PremiumCardContent>
                </PremiumCard>
              )}

              {/* Key Reminders Card */}
              {thingsToRemember.length > 0 && (
                <PremiumCard category="mindset">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle className="text-base">Key Reminders</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent>
                    <ul className="space-y-2">
                      {thingsToRemember.map((reminder, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span>{reminder}</span>
                        </li>
                      ))}
                    </ul>
                  </PremiumCardContent>
                </PremiumCard>
              )}

              {/* Identity & Why Card */}
              {identityData?.identity && (
                <PremiumCard category="mindset">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle className="text-base">Your Identity</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">I am becoming</p>
                      <p className="text-sm font-medium">{identityData.identity}</p>
                    </div>
                    {identityData.why && (
                      <div>
                        <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Because</p>
                        <p className="text-sm">{identityData.why}</p>
                      </div>
                    )}
                    {identityData.feeling && (
                      <div>
                        <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">I want to feel</p>
                        <p className="text-sm italic">{identityData.feeling}</p>
                      </div>
                    )}
                  </PremiumCardContent>
                </PremiumCard>
              )}

              {/* Diagnostic Scores */}
              {diagnosticScores && (diagnosticScores.discover || diagnosticScores.nurture || diagnosticScores.convert) && (
                <PremiumCard category="plan">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle className="text-base">Business Diagnostic</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent>
                    <div className="space-y-3">
                      {diagnosticScores.discover !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Discover (Lead Gen)</span>
                          <div className="flex items-center gap-2">
                            <Progress value={diagnosticScores.discover * 10} className="w-16 h-2" />
                            <span className="text-sm font-medium w-6">{diagnosticScores.discover}/10</span>
                          </div>
                        </div>
                      )}
                      {diagnosticScores.nurture !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Nurture</span>
                          <div className="flex items-center gap-2">
                            <Progress value={diagnosticScores.nurture * 10} className="w-16 h-2" />
                            <span className="text-sm font-medium w-6">{diagnosticScores.nurture}/10</span>
                          </div>
                        </div>
                      )}
                      {diagnosticScores.convert !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Convert (Sales)</span>
                          <div className="flex items-center gap-2">
                            <Progress value={diagnosticScores.convert * 10} className="w-16 h-2" />
                            <span className="text-sm font-medium w-6">{diagnosticScores.convert}/10</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </PremiumCardContent>
                </PremiumCard>
              )}

              {/* Audience & Message Card */}
              {audienceData && (audienceData.target || audienceData.message) && (
                <PremiumCard category="plan">
                  <PremiumCardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-foreground-muted" />
                      <PremiumCardTitle className="text-base">Your Audience</PremiumCardTitle>
                    </div>
                  </PremiumCardHeader>
                  <PremiumCardContent className="space-y-3">
                    {audienceData.target && (
                      <div>
                        <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Who I Serve</p>
                        <p className="text-sm">{audienceData.target}</p>
                      </div>
                    )}
                    {audienceData.frustration && (
                      <div>
                        <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">Their Pain Point</p>
                        <p className="text-sm">{audienceData.frustration}</p>
                      </div>
                    )}
                    {audienceData.message && (
                      <div>
                        <p className="text-xs text-foreground-muted uppercase tracking-wide mb-1">My Signature Message</p>
                        <p className="text-sm italic">"{audienceData.message}"</p>
                      </div>
                    )}
                  </PremiumCardContent>
                </PremiumCard>
              )}

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
