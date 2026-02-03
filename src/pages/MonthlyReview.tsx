import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Target, TrendingUp, CheckCircle2, AlertTriangle, Heart, DollarSign, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ReflectionList } from "@/components/ReflectionList";
import { HabitTrackerCard } from "@/components/habits";
import { ToastAction } from "@/components/ui/toast";
import { SaveStatusIndicator, SaveStatusBanner } from "@/components/SaveStatusIndicator";
import { LaunchCheckInCard } from "@/components/launch/LaunchCheckInCard";
import { LaunchProgressCard } from "@/components/monthly-review/LaunchProgressCard";
import { SummitCheckInCard } from "@/components/reviews/SummitCheckInCard";
import { SprintSummaryCard } from "@/components/reviews/SprintSummaryCard";
// Modular 4-hook data protection system (Prompt 5)
import { useLocalStorageSync, ConflictInfo } from "@/hooks/useLocalStorageSync";
import { useServerSync, SyncStatus } from "@/hooks/useServerSync";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useMobileProtection } from "@/hooks/useMobileProtection";
import { ConflictResolutionModal, ConflictData } from "@/components/data-protection";

interface ExecutionSummary {
  tasks_scheduled: number;
  tasks_completed: number;
  tasks_rescheduled_3plus: number;
  content_tasks_completed: number;
  nurture_tasks_completed: number;
  offer_tasks_completed: number;
  habit_consistency: number;
}

export default function MonthlyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [month, setMonth] = useState<number>(0);
  const [monthInCycle, setMonthInCycle] = useState<number>(1);
  const [cycleGoal, setCycleGoal] = useState<string>("");
  const [monthFocus, setMonthFocus] = useState<string>("");

  const [wins, setWins] = useState<string[]>([""]);
  const [challenges, setChallenges] = useState<string[]>([""]);
  const [lessons, setLessons] = useState<string[]>([""]);
  const [priorities, setPriorities] = useState<string[]>([""]);
  const [monthScore, setMonthScore] = useState(5);

  const [executionSummary, setExecutionSummary] = useState<ExecutionSummary | null>(null);
  const [suggestedWins, setSuggestedWins] = useState<string[]>([]);
  const [habitConsistency, setHabitConsistency] = useState(0);
  const [cycleProgress, setCycleProgress] = useState(0);

  // Track initial load to prevent auto-save on first load
  const isInitialLoadRef = useRef(true);
  
  // Conflict resolution state (Prompt 12)
  const [conflictData, setConflictData] = useState<ConflictData<typeof reviewData> | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Memoize review data for data protection
  const reviewData = useMemo(() => ({
    reviewId,
    cycleId,
    month,
    monthInCycle,
    wins: wins.filter(Boolean),
    challenges: challenges.filter(Boolean),
    lessons: lessons.filter(Boolean),
    priorities: priorities.filter(Boolean),
    monthScore,
  }), [reviewId, cycleId, month, monthInCycle, wins, challenges, lessons, priorities, monthScore]);

  const reviewDataRef = useRef(reviewData);
  useEffect(() => {
    reviewDataRef.current = reviewData;
  }, [reviewData]);

  // Local storage key for this review
  const storageKey = `monthly_review_backup_${monthInCycle}`;

  // ===== HOOK 1: Local Storage Sync (0ms, immediate) =====
  const { 
    save: saveLocal, 
    load: loadLocalBackup, 
    getTimestamp: getLocalTimestamp,
    tabId 
  } = useLocalStorageSync<typeof reviewData>({
    key: storageKey,
    enableIndexDBFallback: true,
    enableCrossTabSync: true,
    pageType: '30-Day Review',
    onRemoteUpdate: (data) => {
      // Another tab updated - refresh local state
      if (data.wins) setWins(data.wins.length ? data.wins : ['']);
      if (data.challenges) setChallenges(data.challenges.length ? data.challenges : ['']);
      if (data.lessons) setLessons(data.lessons.length ? data.lessons : ['']);
      if (data.priorities) setPriorities(data.priorities.length ? data.priorities : ['']);
      if (data.monthScore) setMonthScore(data.monthScore);
      toast({ title: 'Updated from another tab' });
    },
    onConflict: (conflict) => {
      setConflictData(conflict as ConflictData<typeof reviewData>);
      setShowConflictModal(true);
    },
  });

  // Save function for server sync
  const handleServerSave = useCallback(async (data: typeof reviewData) => {
    if (!data.reviewId || !data.cycleId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-monthly-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        review_id: data.reviewId,
        cycle_id: data.cycleId,
        month: data.month,
        month_in_cycle: data.monthInCycle,
        wins: data.wins,
        challenges: data.challenges,
        lessons: data.lessons,
        priorities: data.priorities,
        month_score: data.monthScore,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to save review: ${res.status}`);
    }
  }, []);

  // ===== HOOK 2: Server Sync (1s debounce) =====
  const { 
    sync: syncServer, 
    syncNow: syncServerNow, 
    status: serverStatus, 
    lastSynced: lastSaved 
  } = useServerSync<typeof reviewData>({
    saveFn: handleServerSave,
    delay: 1000,
    maxRetries: 3,
    retryDelay: 5000,
  });

  // Combined save status
  const saveStatus: SyncStatus = serverStatus;

  // ===== HOOK 3: Before Unload (desktop warning) =====
  const hasUnsavedChanges = serverStatus === 'pending' || serverStatus === 'saving';
  useBeforeUnload({
    hasUnsavedChanges,
    onFinalSave: () => saveLocal(reviewDataRef.current),
    emergencyConfig: user ? {
      userId: user.id,
      pageType: 'monthly_review',
      pageId: reviewId || undefined,
      getData: () => reviewDataRef.current,
    } : undefined,
  });

  // ===== HOOK 4: Mobile Protection (visibility/pagehide) =====
  useMobileProtection({
    getData: () => reviewDataRef.current,
    onSave: (data) => { saveLocal(data); },
    emergencyConfig: user ? {
      userId: user.id,
      pageType: 'monthly_review',
      pageId: reviewId || undefined,
    } : undefined,
  });

  // Register changes after initial load - trigger both local and server sync
  useEffect(() => {
    if (!loading && !isInitialLoadRef.current && reviewId && cycleId) {
      saveLocal(reviewData);
      syncServer(reviewData);
    }
  }, [reviewData, loading, reviewId, cycleId, saveLocal, syncServer]);

  // Manual save function
  const saveNow = useCallback(async () => {
    await saveLocal(reviewData);
    await syncServerNow(reviewData);
  }, [reviewData, saveLocal, syncServerNow]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback(async (
    choice: 'local' | 'remote' | 'merge',
    mergedData?: typeof reviewData
  ) => {
    setShowConflictModal(false);
    
    const dataToUse = choice === 'merge' && mergedData 
      ? mergedData 
      : choice === 'local' 
        ? conflictData?.local.data 
        : conflictData?.remote.data;
    
    if (dataToUse) {
      // Apply the chosen data
      if (dataToUse.wins) setWins(dataToUse.wins.length ? dataToUse.wins : ['']);
      if (dataToUse.challenges) setChallenges(dataToUse.challenges.length ? dataToUse.challenges : ['']);
      if (dataToUse.lessons) setLessons(dataToUse.lessons.length ? dataToUse.lessons : ['']);
      if (dataToUse.priorities) setPriorities(dataToUse.priorities.length ? dataToUse.priorities : ['']);
      if (dataToUse.monthScore) setMonthScore(dataToUse.monthScore);
      
      // Save the resolved data
      await saveLocal(dataToUse);
      await syncServerNow(dataToUse);
    }
    
    setConflictData(null);
  }, [conflictData, saveLocal, syncServerNow]);


  useEffect(() => {
    if (user) {
      loadMonthlyReview();
    }
  }, [user]);

  const loadMonthlyReview = async () => {
    try {
      setLoading(true);
      isInitialLoadRef.current = true;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-monthly-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load review: ${res.status}`);
      }

      const data = await res.json();

      setReviewId(data.review_id || null);
      setCycleId(data.cycle_id || null);
      setMonth(data.month || 0);
      setMonthInCycle(data.month_in_cycle || 1);
      setCycleGoal(data.cycle_goal || "");
      setMonthFocus(data.month_focus || "");
      setWins(Array.isArray(data.wins) && data.wins.length > 0 ? data.wins : [""]);
      setChallenges(Array.isArray(data.challenges) && data.challenges.length > 0 ? data.challenges : [""]);
      setLessons(Array.isArray(data.lessons) && data.lessons.length > 0 ? data.lessons : [""]);
      setPriorities(Array.isArray(data.priorities) && data.priorities.length > 0 ? data.priorities : [""]);
      setMonthScore(data.month_score || 5);
      setExecutionSummary(data.execution_summary || null);
      setSuggestedWins(data.suggested_wins || []);
      setHabitConsistency(data.habit_consistency || 0);
      setCycleProgress(data.cycle_progress_percent || 0);

    } catch (error) {
      console.error("Error loading monthly review:", error);
      toast({ title: "Failed to load monthly review", variant: "destructive" });
    } finally {
      setLoading(false);
      // Allow auto-save after a short delay to prevent immediate trigger
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  };

  const handleCreateTasksFromPriorities = async (autoSchedule: boolean) => {
    const validPriorities = priorities.filter(Boolean);
    if (validPriorities.length === 0) {
      toast({ title: "No priorities to convert", description: "Add some priorities first", variant: "destructive" });
      return;
    }

    try {
      setCreatingTasks(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tasks-from-priorities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priorities: validPriorities,
          cycle_id: cycleId,
          month_in_cycle: monthInCycle,
          auto_schedule: autoSchedule,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create tasks");
      }

      toast({
        title: "Priorities converted to tasks!",
        description: `Created ${data.tasks_created} tasks in "${data.project_name}"`,
        action: (
          <ToastAction altText="View Week 1" onClick={() => navigate("/weekly-plan")}>
            View Week 1
          </ToastAction>
        ),
      });

    } catch (error: any) {
      console.error("Error creating tasks:", error);
      toast({ title: "Failed to create tasks", description: error.message, variant: "destructive" });
    } finally {
      setCreatingTasks(false);
    }
  };

  const addSuggestedWin = (win: string) => {
    setWins(prev => {
      const filtered = prev.filter(Boolean);
      return [...filtered, win, ""];
    });
    toast({ title: "Win added!", description: win });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!reviewId) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>No Active Cycle</CardTitle>
            <CardDescription>Please create a cycle first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/cycle-setup")}>Go to Cycle Setup</Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Save Status Banner */}
        <SaveStatusBanner status={saveStatus} onRetry={saveNow} />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">30-Day Review</h1>
            <p className="text-muted-foreground">30-Day Block {monthInCycle} of your 90-Day Cycle</p>
          </div>
          <div className="flex gap-2 items-center">
            <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/weekly-plan")}>
              Weekly Plan
            </Button>
          </div>
        </div>

        {/* Cycle Context Banner */}
        {(cycleGoal || monthFocus) && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  {cycleGoal && (
                    <p className="text-sm">
                      <span className="font-medium">90-Day Goal:</span> {cycleGoal}
                    </p>
                  )}
                  {monthFocus && (
                    <p className="text-sm">
                      <span className="font-medium">Month {monthInCycle} Focus:</span>{" "}
                      <span className="text-primary font-medium">{monthFocus}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cycle Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={cycleProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{cycleProgress}% complete</p>
            </CardContent>
          </Card>

          <HabitTrackerCard view="monthly" />
        </div>

        {/* Launch Progress (if active launches) */}
        <LaunchProgressCard />
        <LaunchCheckInCard reviewType="monthly" />

        {/* Summit Progress (if active summits) */}
        <SummitCheckInCard showAllSummits />

        {/* Sprint Summary (if active sprint) */}
        <SprintSummaryCard />

        {/* Execution Summary */}
        {executionSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Execution Summary
              </CardTitle>
              <CardDescription>Your activity this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{executionSummary.tasks_completed}</div>
                  <div className="text-xs text-muted-foreground">Tasks Done</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{executionSummary.content_tasks_completed}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    Content
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{executionSummary.nurture_tasks_completed}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Heart className="h-3 w-3" /> Nurture
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{executionSummary.offer_tasks_completed}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <DollarSign className="h-3 w-3" /> Offers
                  </div>
                </div>
              </div>
              
              {executionSummary.tasks_rescheduled_3plus > 0 && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm">
                    {executionSummary.tasks_rescheduled_3plus} tasks rescheduled 3+ times this month
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Suggested Wins */}
        {suggestedWins.length > 0 && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Suggested Wins</CardTitle>
              <CardDescription>Click to add to your wins list</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {suggestedWins.map((win, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-green-500/10 transition-colors"
                    onClick={() => addSuggestedWin(win)}
                  >
                    + {win}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 30-Day Wins */}
        <Card>
          <CardHeader>
            <CardTitle>Wins This 30-Day Block</CardTitle>
            <CardDescription>Celebrate your accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={wins}
              onChange={setWins}
              label="Win"
              placeholder="What went well this 30-day block?"
            />
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>What obstacles did you face?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={challenges}
              onChange={setChallenges}
              label="Challenge"
              placeholder="What was difficult this 30-day block?"
            />
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>Lessons Learned</CardTitle>
            <CardDescription>Key insights and realizations</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={lessons}
              onChange={setLessons}
              label="Lesson"
              placeholder="What did you learn?"
            />
          </CardContent>
        </Card>

        {/* Priorities for Next 30-Day Block */}
        <Card>
          <CardHeader>
            <CardTitle>Priorities for Next 30 Days</CardTitle>
            <CardDescription>What will you focus on moving forward?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReflectionList
              items={priorities}
              onChange={setPriorities}
              label="Priority"
              placeholder="What's most important for the next 30 days?"
            />
            
            {priorities.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateTasksFromPriorities(true)}
                  disabled={creatingTasks}
                >
                  {creatingTasks ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Auto-Schedule to Week 1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateTasksFromPriorities(false)}
                  disabled={creatingTasks}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Create as Tasks (unscheduled)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Score */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Score</CardTitle>
            <CardDescription>Rate your overall month from 0 to 10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Slider
                value={[monthScore]}
                onValueChange={(value) => setMonthScore(value[0])}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <div className="text-3xl font-bold w-16 text-center text-primary">{monthScore}</div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
          <Button onClick={saveNow} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Review"
            )}
          </Button>
        </div>

        {/* Conflict Resolution Modal (Prompt 12) */}
        <ConflictResolutionModal
          open={showConflictModal}
          onOpenChange={setShowConflictModal}
          conflict={conflictData}
          onResolve={handleConflictResolve}
          fieldLabels={{
            wins: 'Wins',
            challenges: 'Challenges',
            lessons: 'Lessons Learned',
            priorities: 'Next Month Priorities',
            monthScore: 'Month Score',
          }}
        />
      </div>
    </Layout>
  );
}
