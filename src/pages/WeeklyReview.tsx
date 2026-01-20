import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, Target, BarChart3, TrendingUp, TrendingDown, Users, Share2, Send, Mail, Download, Trophy } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ReflectionList } from "@/components/ReflectionList";
import { HabitTrackerCard } from "@/components/habits";
import { CourseProgressPanel } from "@/components/courses";
import { getNurtureStats } from "@/lib/contentService";
import { useDataProtection } from "@/hooks/useDataProtection";
import { SaveStatusIndicator, SaveStatusBanner } from "@/components/SaveStatusIndicator";

interface Belief {
  belief_id: string;
  upgraded_belief: string;
  confidence_score: number;
}

// Metric input component with trend indicator
function MetricInput({
  name,
  value,
  onChange,
  previousValue,
}: {
  name: string;
  value: number | '';
  onChange: (val: number | '') => void;
  previousValue: number | null | undefined;
}) {
  const currentValue = typeof value === 'number' ? value : null;
  const hasChange = currentValue !== null && previousValue !== null && previousValue !== undefined;
  const change = hasChange ? currentValue - previousValue : null;

  return (
    <div className="space-y-2">
      <Label htmlFor={`metric-${name}`} className="font-semibold">{name}</Label>
      <Input
        id={`metric-${name}`}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="Enter this week's actual"
      />
      {previousValue !== null && previousValue !== undefined ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Last week: {previousValue}</span>
          {change !== null && (
            <span className={`flex items-center gap-1 font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {change > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  +{change}
                </>
              ) : change < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4" />
                  {change}
                </>
              ) : (
                'No change'
              )}
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">First week tracked</p>
      )}
    </div>
  );
}

export default function WeeklyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekId, setWeekId] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<string | null>(null);
  
  // Track if initial load is complete to prevent auto-save during data population
  const isInitialLoadRef = useRef(true);

  // Cycle metrics from cycle setup (now 5 metrics)
  const [cycleMetrics, setCycleMetrics] = useState<{
    metric_1_name: string | null;
    metric_2_name: string | null;
    metric_3_name: string | null;
    metric_4_name: string | null;
    metric_5_name: string | null;
  } | null>(null);

  // Actual metrics for this week (5 metrics)
  const [metric1Actual, setMetric1Actual] = useState<number | ''>('');
  const [metric2Actual, setMetric2Actual] = useState<number | ''>('');
  const [metric3Actual, setMetric3Actual] = useState<number | ''>('');
  const [metric4Actual, setMetric4Actual] = useState<number | ''>('');
  const [metric5Actual, setMetric5Actual] = useState<number | ''>('');

  // Previous week's actuals for trend comparison
  const [previousMetrics, setPreviousMetrics] = useState<{
    metric_1_actual: number | null;
    metric_2_actual: number | null;
    metric_3_actual: number | null;
    metric_4_actual: number | null;
    metric_5_actual: number | null;
  } | null>(null);

  const [wins, setWins] = useState<string[]>([""]);
  const [challenges, setChallenges] = useState<string[]>([""]);
  const [lessons, setLessons] = useState<string[]>([""]);
  const [intentions, setIntentions] = useState<string[]>([""]);
  const [weeklyScore, setWeeklyScore] = useState(5);
  const [focusReflection, setFocusReflection] = useState("");
  const [shareToCommunity, setShareToCommunity] = useState(false);

  const [habitStats, setHabitStats] = useState({ total: 0, completed: 0, percent: 0 });
  const [cycleProgress, setCycleProgress] = useState({ total_days: 90, completed_days: 0, percent: 0 });
  const [nurtureStats, setNurtureStats] = useState({ thisWeekEmails: 0, thisWeekTotal: 0, streak: 0 });
  const [loadingWins, setLoadingWins] = useState(false);

  // Store weekStartDate for loading wins from scratch pad
  const [weekStartDate, setWeekStartDate] = useState<string | null>(null);

  // Memoize review data for data protection
  const reviewData = useMemo(() => ({
    week_id: weekId,
    wins,
    challenges,
    lessons,
    intentions,
    weeklyScore,
    focusReflection,
    shareToCommunity,
    metric1Actual,
    metric2Actual,
    metric3Actual,
    metric4Actual,
    metric5Actual,
  }), [weekId, wins, challenges, lessons, intentions, weeklyScore, focusReflection, shareToCommunity, metric1Actual, metric2Actual, metric3Actual, metric4Actual, metric5Actual]);

  // Data protection hook for auto-save, localStorage backup, and offline handling
  const {
    register: registerData,
    saveNow,
    saveStatus,
    hasUnsavedChanges,
    isOnline,
    lastSaved,
  } = useDataProtection({
    saveFn: async (data) => {
      if (!data.week_id) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-weekly-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          week_id: data.week_id,
          wins: data.wins.filter(Boolean),
          challenges: data.challenges.filter(Boolean),
          lessons: data.lessons.filter(Boolean),
          intentions: data.intentions.filter(Boolean),
          weekly_score: data.weeklyScore,
          focus_reflection: data.focusReflection,
          share_to_community: data.shareToCommunity,
          metric_1_actual: data.metric1Actual === '' ? null : data.metric1Actual,
          metric_2_actual: data.metric2Actual === '' ? null : data.metric2Actual,
          metric_3_actual: data.metric3Actual === '' ? null : data.metric3Actual,
          metric_4_actual: data.metric4Actual === '' ? null : data.metric4Actual,
          metric_5_actual: data.metric5Actual === '' ? null : data.metric5Actual,
        }),
      });

      if (!res.ok) throw new Error(`Failed to save review: ${res.status}`);
    },
    autoSaveDelay: 2500,
    localStorageKey: `weekly_review_backup_${weekId}`,
    enableLocalBackup: true,
    enableBeforeUnload: true,
    maxRetries: 3,
    retryDelay: 5000,
  });

  // Register data changes (only after initial load)
  useEffect(() => {
    if (loading || isInitialLoadRef.current || !weekId) return;
    registerData(reviewData);
  }, [reviewData, loading, weekId, registerData]);

  // Fetch beliefs
  const { data: beliefs = [] } = useQuery<Belief[]>({
    queryKey: ['beliefs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-beliefs', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      return data as Belief[];
    }
  });

  useEffect(() => {
    if (user) {
      loadWeeklyReview();
    }
  }, [user]);

  const loadWeeklyReview = async () => {
    try {
      setLoading(true);
      isInitialLoadRef.current = true;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-weekly-review`, {
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

      // Normalize data safely
      setWeekId(data.week_id || null);
      setFocusArea(data.focus_area || null);
      setWins(Array.isArray(data.wins) && data.wins.length > 0 ? data.wins : [""]);
      setChallenges(Array.isArray(data.challenges) && data.challenges.length > 0 ? data.challenges : [""]);
      setLessons(Array.isArray(data.lessons) && data.lessons.length > 0 ? data.lessons : [""]);
      setIntentions(Array.isArray(data.intentions) && data.intentions.length > 0 ? data.intentions : [""]);
      setWeeklyScore(data.weekly_score || 5);
      setFocusReflection(data.focus_reflection || "");
      setShareToCommunity(data.share_to_community || false);
      setHabitStats(data.habit_stats || { total: 0, completed: 0, percent: 0 });
      setCycleProgress(data.cycle_progress || { total_days: 90, completed_days: 0, percent: 0 });
      
      // Store week start date for loading wins
      if (data.week_start) {
        setWeekStartDate(data.week_start);
      }

      // Set cycle metrics and actuals
      if (data.cycle_metrics) {
        setCycleMetrics(data.cycle_metrics);
      }
      setMetric1Actual(data.metric_1_actual ?? '');
      setMetric2Actual(data.metric_2_actual ?? '');
      setMetric3Actual(data.metric_3_actual ?? '');
      setMetric4Actual(data.metric_4_actual ?? '');
      setMetric5Actual(data.metric_5_actual ?? '');
      
      // Set previous week's metrics for trend comparison
      if (data.previous_metrics) {
        setPreviousMetrics(data.previous_metrics);
      }

      // Load nurture stats
      try {
        const stats = await getNurtureStats();
        setNurtureStats(stats);
      } catch (e) {
        console.error('Error loading nurture stats:', e);
      }

    } catch (error) {
      console.error("Error loading weekly review:", error);
      toast({ title: "Failed to load weekly review", variant: "destructive" });
    } finally {
      setLoading(false);
      // Allow auto-save after initial load completes
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  };

  // Load wins from scratch pad for the current week
  const loadWinsFromScratchPad = async () => {
    if (!user || !weekStartDate) return;
    
    try {
      setLoadingWins(true);
      
      // Get daily plans for this week with wins
      const weekEnd = new Date(weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const { data, error } = await supabase
        .from('daily_plans')
        .select('date, daily_wins')
        .eq('user_id', user.id)
        .gte('date', weekStartDate)
        .lte('date', weekEnd.toISOString().split('T')[0])
        .not('daily_wins', 'is', null);
      
      if (error) throw error;
      
      // Extract win texts
      const scratchPadWins: string[] = [];
      data?.forEach((plan) => {
        const planWins = plan.daily_wins as unknown as Array<{ text: string }>;
        if (Array.isArray(planWins)) {
          planWins.forEach((win) => {
            if (win.text && !scratchPadWins.includes(win.text)) {
              scratchPadWins.push(win.text);
            }
          });
        }
      });
      
      if (scratchPadWins.length === 0) {
        toast({ title: "No wins found", description: "Use #win in your daily scratch pad to capture wins" });
        return;
      }
      
      // Merge with existing wins (avoid duplicates)
      const existingWins = wins.filter(w => w.trim());
      const newWins = scratchPadWins.filter(w => !existingWins.includes(w));
      const mergedWins = [...existingWins, ...newWins];
      
      if (mergedWins.length === 0) mergedWins.push('');
      setWins(mergedWins);
      
      toast({ title: `Loaded ${newWins.length} wins from scratch pad!` });
    } catch (error) {
      console.error('Error loading wins:', error);
      toast({ title: "Failed to load wins", variant: "destructive" });
    } finally {
      setLoadingWins(false);
    }
  };

  const handleSave = async () => {
    if (!weekId) {
      toast({ title: "No active week to save", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-weekly-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          week_id: weekId,
          wins: wins.filter(Boolean),
          challenges: challenges.filter(Boolean),
          lessons: lessons.filter(Boolean),
          intentions: intentions.filter(Boolean),
          weekly_score: weeklyScore,
          focus_reflection: focusReflection,
          share_to_community: shareToCommunity,
          metric_1_actual: metric1Actual === '' ? null : metric1Actual,
          metric_2_actual: metric2Actual === '' ? null : metric2Actual,
          metric_3_actual: metric3Actual === '' ? null : metric3Actual,
          metric_4_actual: metric4Actual === '' ? null : metric4Actual,
          metric_5_actual: metric5Actual === '' ? null : metric5Actual,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save review: ${res.status}`);
      }

      toast({ title: "Weekly Review Saved!", description: "Your reflection has been saved." });
      navigate("/dashboard");

    } catch (error) {
      console.error("Error saving weekly review:", error);
      toast({ title: "Failed to save review", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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

  if (!weekId) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>No Active Week</CardTitle>
            <CardDescription>Please create a weekly plan first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/weekly-plan")}>Go to Weekly Plan</Button>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Weekly Review</h1>
            <p className="text-muted-foreground">Reflect on your week and plan ahead</p>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/weekly-plan")}>
              Weekly Plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/monthly-review")}>
              Monthly Review
            </Button>
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Cycle Progress</CardTitle>
              <CardDescription>
                Day {cycleProgress.completed_days} of {cycleProgress.total_days}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={cycleProgress.percent} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{cycleProgress.percent}%</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Nurture Consistency</CardTitle>
              </div>
              <CardDescription>
                {nurtureStats.streak} week streak
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>{nurtureStats.thisWeekEmails} emails</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span>{nurtureStats.thisWeekTotal} total touches</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Habit Consistency Tracker */}
        <HabitTrackerCard view="weekly" />

        {/* Course Progress Panel */}
        <CourseProgressPanel />

        {/* Focus Area Reflection */}
        {focusArea && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Focus Area Reflection</CardTitle>
              </div>
              <CardDescription>
                Your focus this quarter: <span className="font-bold text-primary">{focusArea}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="focus-reflection">
                How did your actions this week support your {focusArea} focus?
              </Label>
              <Textarea
                id="focus-reflection"
                value={focusReflection}
                onChange={(e) => setFocusReflection(e.target.value)}
                placeholder={`Describe how you worked on ${focusArea} this week...`}
                rows={3}
                className="mt-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Actual Metrics This Week */}
        {cycleMetrics && (cycleMetrics.metric_1_name || cycleMetrics.metric_2_name || cycleMetrics.metric_3_name || cycleMetrics.metric_4_name || cycleMetrics.metric_5_name) && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Actual Numbers This Week</CardTitle>
              </div>
              <CardDescription>How did you do?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {cycleMetrics.metric_1_name && (
                <MetricInput
                  name={cycleMetrics.metric_1_name}
                  value={metric1Actual}
                  onChange={setMetric1Actual}
                  previousValue={previousMetrics?.metric_1_actual}
                />
              )}
              {cycleMetrics.metric_2_name && (
                <MetricInput
                  name={cycleMetrics.metric_2_name}
                  value={metric2Actual}
                  onChange={setMetric2Actual}
                  previousValue={previousMetrics?.metric_2_actual}
                />
              )}
              {cycleMetrics.metric_3_name && (
                <MetricInput
                  name={cycleMetrics.metric_3_name}
                  value={metric3Actual}
                  onChange={setMetric3Actual}
                  previousValue={previousMetrics?.metric_3_actual}
                />
              )}
              {cycleMetrics.metric_4_name && (
                <MetricInput
                  name={cycleMetrics.metric_4_name}
                  value={metric4Actual}
                  onChange={setMetric4Actual}
                  previousValue={previousMetrics?.metric_4_actual}
                />
              )}
              {cycleMetrics.metric_5_name && (
                <MetricInput
                  name={cycleMetrics.metric_5_name}
                  value={metric5Actual}
                  onChange={setMetric5Actual}
                  previousValue={previousMetrics?.metric_5_actual}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Wins */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weekly Wins</CardTitle>
                <CardDescription>List moments you're proud of, big or small</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadWinsFromScratchPad}
                disabled={loadingWins}
                className="text-xs"
              >
                {loadingWins ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trophy className="h-3 w-3 mr-1 text-yellow-500" />
                )}
                Load from Scratch Pad
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={wins}
              onChange={setWins}
              label="Win"
              placeholder="What went well this week?"
              shareableType="win"
            />
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>What felt hard or draining this week?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={challenges}
              onChange={setChallenges}
              label="Challenge"
              placeholder="What was difficult?"
              shareableType="challenge"
            />
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>Lessons Learned</CardTitle>
            <CardDescription>What did you learn about yourself or your work?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={lessons}
              onChange={setLessons}
              label="Lesson"
              placeholder="What insights did you gain?"
              shareableType="lesson"
            />
          </CardContent>
        </Card>

        {/* Intentions */}
        <Card>
          <CardHeader>
            <CardTitle>Intentions for Next Week</CardTitle>
            <CardDescription>How do you want to show up? What's your #1 focus?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={intentions}
              onChange={setIntentions}
              label="Intention"
              placeholder="How will you approach next week?"
              shareableType="intention"
            />
          </CardContent>
        </Card>

        {/* Weekly Score */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Score</CardTitle>
            <CardDescription>Rate your overall week from 0 to 10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Slider
                value={[weeklyScore]}
                onValueChange={(value) => setWeeklyScore(value[0])}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <div className="text-3xl font-bold w-16 text-center text-primary">{weeklyScore}</div>
            </div>
          </CardContent>
        </Card>

        {/* Share to Community */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Share with Community</CardTitle>
            </div>
            <CardDescription>
              Share your wins and lessons with others for inspiration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="share-toggle">Share this review</Label>
                <p className="text-sm text-muted-foreground">
                  Your wins and lessons will be visible to others anonymously
                </p>
              </div>
              <Switch
                id="share-toggle"
                checked={shareToCommunity}
                onCheckedChange={setShareToCommunity}
              />
            </div>
          </CardContent>
        </Card>

        {/* Belief Strengthening */}
        {beliefs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle>Belief Strengthening</CardTitle>
              </div>
              <CardDescription>Your upgraded beliefs this week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {beliefs.slice(0, 3).map((belief) => (
                <div key={belief.belief_id} className="border-l-2 border-primary pl-3 py-2">
                  <p className="text-sm font-medium">{belief.upgraded_belief}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-24 bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${(belief.confidence_score / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {belief.confidence_score}/10
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Share to Community CTA */}
        <Card className="border-info/20 bg-info/5 dark:bg-info/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10 dark:bg-info/20">
                  <Share2 className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="font-semibold">Want to share this with the group?</p>
                  <p className="text-sm text-muted-foreground">
                    Generate a polished post and share your wins!
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-info/30 hover:bg-info/10"
                onClick={() => navigate('/weekly-reflection', {
                  state: {
                    prefill: {
                      wins: wins.filter(Boolean),
                      lessons: lessons.filter(Boolean),
                      intentions: intentions.filter(Boolean),
                    }
                  }
                })}
              >
                Share Reflection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Review"
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
