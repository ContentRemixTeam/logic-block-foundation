import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeArray, normalizeString, normalizeNumber, normalizeObject } from '@/lib/normalize';
import { UsefulThoughtsModal } from '@/components/UsefulThoughtsModal';
import { WeekPlannerNew } from '@/components/weekly-plan/WeekPlannerNew';
import { WeeklyTimelineView } from '@/components/weekly-plan/WeeklyTimelineView';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LastWeekPriorities } from '@/components/weekly-plan/LastWeekPriorities';
import { ArrowLeft, Calendar, Loader2, Save, CheckCircle2, TrendingUp, Brain, Zap, Target, BarChart3, Clock, LayoutList } from 'lucide-react';
import { useDataProtection } from '@/hooks/useDataProtection';
import { SaveStatusIndicator, SaveStatusBanner } from '@/components/SaveStatusIndicator';
import { DailyTop3Card } from '@/components/arcade';

export default function WeeklyPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightTaskId = searchParams.get('highlightTask');
  
  // Tab state for the new planner
  const [activeTab, setActiveTab] = useState<'planner' | 'worksheet'>('planner');
  
  // Only load worksheet data when that tab is active
  const [worksheetLoading, setWorksheetLoading] = useState(false);
  const [worksheetLoaded, setWorksheetLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>();
  
  // Track if initial load is complete to prevent auto-save during data population
  const isInitialLoadRef = useRef(true);
  
  // Clear highlight param after 3 seconds
  useEffect(() => {
    if (highlightTaskId) {
      const timer = setTimeout(() => {
        searchParams.delete('highlightTask');
        setSearchParams(searchParams, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightTaskId, searchParams, setSearchParams]);

  const [weekId, setWeekId] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<string[]>(['', '', '']);
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [challenges, setChallenges] = useState('');
  const [adjustments, setAdjustments] = useState('');
  const [weeklySummary, setWeeklySummary] = useState({
    daily_plans_completed: 0,
    habit_completion_percent: 0,
    review_completed: false,
  });
  const [cycleGoal, setCycleGoal] = useState('');
  const [thoughtsModalOpen, setThoughtsModalOpen] = useState(false);
  const [identityAnchor, setIdentityAnchor] = useState<any>(null);
  
  // Last week's priorities for carry-over
  const [lastWeekPriorities, setLastWeekPriorities] = useState<string[]>([]);

  // Cycle metrics from cycle setup
  const [cycleMetrics, setCycleMetrics] = useState<{
    metric_1_name: string | null;
    metric_2_name: string | null;
    metric_3_name: string | null;
  } | null>(null);

  // Weekly metric targets
  const [metric1Target, setMetric1Target] = useState<number | ''>('');
  const [metric2Target, setMetric2Target] = useState<number | ''>('');
  const [metric3Target, setMetric3Target] = useState<number | ''>('');
  // Memoize worksheet data for data protection
  const worksheetData = useMemo(() => ({
    week_id: weekId,
    priorities,
    thought,
    feeling,
    challenges,
    adjustments,
    metric1Target,
    metric2Target,
    metric3Target,
  }), [weekId, priorities, thought, feeling, challenges, adjustments, metric1Target, metric2Target, metric3Target]);

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
      if (!user || !data.week_id) return;
      
      const { error: fnError } = await supabase.functions.invoke('save-weekly-plan', {
        body: {
          week_id: data.week_id,
          user_id: user.id,
          top_3_priorities: data.priorities.filter((p: string) => p.trim()),
          weekly_thought: data.thought,
          weekly_feeling: data.feeling,
          challenges: data.challenges,
          adjustments: data.adjustments,
          metric_1_target: data.metric1Target === '' ? null : data.metric1Target,
          metric_2_target: data.metric2Target === '' ? null : data.metric2Target,
          metric_3_target: data.metric3Target === '' ? null : data.metric3Target,
        },
      });
      if (fnError) throw fnError;
    },
    autoSaveDelay: 2500,
    localStorageKey: `weekly_plan_backup_${weekId}`,
    enableLocalBackup: true,
    enableBeforeUnload: true,
    maxRetries: 3,
    retryDelay: 5000,
  });

  // Register data changes (only after initial load)
  useEffect(() => {
    if (!worksheetLoaded || isInitialLoadRef.current || !weekId) return;
    registerData(worksheetData);
  }, [worksheetData, worksheetLoaded, weekId, registerData]);
  
  // Load worksheet data lazily when tab becomes active
  useEffect(() => {
    if (activeTab === 'worksheet' && !worksheetLoaded && user) {
      loadWorksheetData();
    }
  }, [activeTab, worksheetLoaded, user]);

  const loadWorksheetData = async () => {
    if (!user) return;

    setWorksheetLoading(true);
    isInitialLoadRef.current = true;
    try {
      setError(null);
      
      // Load weekly plan and identity anchor in parallel
      const [weeklyPlanResult, identityResult] = await Promise.all([
        supabase.functions.invoke('get-weekly-plan'),
        supabase.functions.invoke('get-identity-anchors'),
      ]);

      if (weeklyPlanResult.error) throw weeklyPlanResult.error;
      if (weeklyPlanResult.data?.error) {
        setError(weeklyPlanResult.data.error);
        return;
      }

      if (weeklyPlanResult.data?.data) {
        const weekData = weeklyPlanResult.data.data;
        setWeekId(weekData.week_id);
        setCycleGoal(normalizeString(weekData.cycle_goal));
        
        const normalizedPriorities = normalizeArray(weekData.top_3_priorities);
        setPriorities([
          normalizedPriorities[0] || '',
          normalizedPriorities[1] || '',
          normalizedPriorities[2] || '',
        ]);
        
        setThought(normalizeString(weekData.weekly_thought));
        setFeeling(normalizeString(weekData.weekly_feeling));
        setChallenges(normalizeString(weekData.challenges));
        setAdjustments(normalizeString(weekData.adjustments));
        setWeeklySummary(normalizeObject(weekData.weekly_summary, {
          daily_plans_completed: 0,
          habit_completion_percent: 0,
          review_completed: false,
        }));

        if (weekData.cycle_metrics) {
          setCycleMetrics(weekData.cycle_metrics);
        }
        
        // Set last week's priorities for carry-over
        setLastWeekPriorities(normalizeArray(weekData.last_week_priorities));

        setMetric1Target(weekData.metric_1_target ?? '');
        setMetric2Target(weekData.metric_2_target ?? '');
        setMetric3Target(weekData.metric_3_target ?? '');
      }

      // Set identity anchor
      if (!identityResult.error && identityResult.data?.length > 0) {
        setIdentityAnchor(normalizeObject(identityResult.data[0], null));
      }
      
      setWorksheetLoaded(true);
      
      // Allow auto-save after initial load completes
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    } catch (error: any) {
      console.error('Error loading weekly plan:', error);
      setError(error?.message || 'Failed to load weekly plan');
    } finally {
      setWorksheetLoading(false);
    }
  };

  const updatePriority = useCallback((idx: number, value: string) => {
    setPriorities(prev => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  }, []);

  // Handle carry-over from last week
  const handleCarryOver = useCallback((priority: string, _index: number) => {
    // Find the first empty priority slot
    setPriorities(prev => {
      const emptyIdx = prev.findIndex(p => !p.trim());
      if (emptyIdx !== -1) {
        const updated = [...prev];
        updated[emptyIdx] = priority;
        return updated;
      }
      // If all slots are filled, show toast
      toast({
        title: 'All priority slots filled',
        description: 'Clear a slot first to carry over this priority.',
        variant: 'destructive',
      });
      return prev;
    });
    toast({
      title: 'Priority carried over',
      description: 'Added to this week\'s priorities.',
    });
  }, [toast]);

  const handleDropPriority = useCallback((_index: number) => {
    toast({
      title: 'Priority dropped',
      description: 'This priority won\'t be carried over.',
    });
  }, [toast]);

  const handleMarkDone = useCallback((_index: number) => {
    toast({
      title: 'Nice work! 🎉',
      description: 'Priority marked as completed.',
    });
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !weekId) return;
    
    setSaving(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('save-weekly-plan', {
        body: {
          week_id: weekId,
          top_3_priorities: priorities.filter((p) => p.trim()),
          weekly_thought: thought,
          weekly_feeling: feeling,
          challenges,
          adjustments,
          metric_1_target: metric1Target === '' ? null : metric1Target,
          metric_2_target: metric2Target === '' ? null : metric2Target,
          metric_3_target: metric3Target === '' ? null : metric3Target,
        },
      });

      if (fnError) throw fnError;

      toast({
        title: 'Weekly plan saved!',
        description: 'Your priorities have been updated.',
      });
    } catch (error: any) {
      console.error('SAVE ERROR:', error);
      toast({
        title: 'Error saving weekly plan',
        description: error?.message || JSON.stringify(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Error state for worksheet (only show if worksheet tab is active and has error)
  if (activeTab === 'worksheet' && error && error.includes('No active cycle')) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No Active Cycle</CardTitle>
              <CardDescription>
                You need to create a 90-day cycle before planning your week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/cycle-setup">
                <Button className="w-full">Start Your First 90-Day Cycle</Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (activeTab === 'worksheet' && error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Weekly Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadWorksheetData}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        {/* New Sunsama-style Weekly Planner */}
        <WeekPlannerNew 
          highlightTaskId={highlightTaskId}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Planning Worksheet (shown when worksheet tab is active) */}
        {activeTab === 'worksheet' && worksheetLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {activeTab === 'worksheet' && worksheetLoaded && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Save Status Banner */}
            <SaveStatusBanner status={saveStatus} onRetry={saveNow} />
            
            {/* Save Status Indicator */}
            <div className="flex justify-end">
              <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
            </div>

            {/* Today's Top 3 - Quick access from weekly view */}
            <DailyTop3Card />
            
            {/* Weekly Summary */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Daily Plans</p>
                    <p className="text-2xl font-bold">{weeklySummary.daily_plans_completed} / 7</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Habit Completion</p>
                    <p className="text-2xl font-bold">{weeklySummary.habit_completion_percent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Weekly Review</p>
                    <p className="text-2xl font-bold">{weeklySummary.review_completed ? '✓ Complete' : '○ Pending'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Week's Priorities for Carry-Over */}
            <LastWeekPriorities
              priorities={lastWeekPriorities}
              onCarryOver={handleCarryOver}
              onDrop={handleDropPriority}
              onMarkDone={handleMarkDone}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle>Top 3 Weekly Priorities</CardTitle>
                  </div>
                  <CardDescription>Focus on the most important outcomes for this week</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {priorities.map((priority, idx) => (
                    <div key={idx}>
                      <Label htmlFor={`priority-${idx}`}>Priority {idx + 1}</Label>
                      <Input
                        id={`priority-${idx}`}
                        value={priority}
                        onChange={(e) => updatePriority(idx, e.target.value)}
                        placeholder="What must you accomplish this week?"
                        required={idx === 0}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weekly Reflection</CardTitle>
                  <CardDescription>Set your mindset and prepare for the week ahead</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="thought">Key Thought for the Week</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setThoughtsModalOpen(true)}>
                        <Brain className="h-4 w-4 mr-2" />
                        Browse Thoughts
                      </Button>
                    </div>
                    <Input
                      id="thought"
                      value={thought}
                      onChange={(e) => setThought(e.target.value)}
                      placeholder="What mindset will serve you this week?"
                    />
                  </div>
                  <div>
                    <Label htmlFor="feeling">How I Want to Feel</Label>
                    <Input
                      id="feeling"
                      value={feeling}
                      onChange={(e) => setFeeling(e.target.value)}
                      placeholder="e.g., Focused, Energized, Calm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="challenges">Anticipated Challenges</Label>
                    <Textarea
                      id="challenges"
                      value={challenges}
                      onChange={(e) => setChallenges(e.target.value)}
                      placeholder="What might get in the way?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adjustments">Adjustments Needed</Label>
                    <Textarea
                      id="adjustments"
                      value={adjustments}
                      onChange={(e) => setAdjustments(e.target.value)}
                      placeholder="What needs to change from last week?"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Weekly Plan'
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
      
      <UsefulThoughtsModal
        open={thoughtsModalOpen}
        onOpenChange={setThoughtsModalOpen}
        onSelect={(selectedThought) => setThought(selectedThought)}
      />
    </Layout>
  );
}
