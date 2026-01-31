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
import { WeeklyScratchPad } from '@/components/weekly-plan/WeeklyScratchPad';
import { WeeklyCycleCheckIn } from '@/components/weekly-plan/WeeklyCycleCheckIn';
import { WeeklyCycleAnalytics } from '@/components/weekly-plan/WeeklyCycleAnalytics';
import { AlignmentCheckSection } from '@/components/weekly-plan/AlignmentCheckSection';
import { ContextPullSection } from '@/components/weekly-plan/ContextPullSection';
import { ExecutionSummarySection } from '@/components/weekly-plan/ExecutionSummarySection';
import { FocusAreaDeepDiveSection } from '@/components/weekly-plan/FocusAreaDeepDiveSection';
import { EnhancedMetricsSection } from '@/components/weekly-plan/EnhancedMetricsSection';
import { ArrowLeft, Calendar, Loader2, Save, CheckCircle2, TrendingUp, Brain, Zap, Target, BarChart3, Clock, LayoutList } from 'lucide-react';
import { useLocalStorageSync } from '@/hooks/useLocalStorageSync';
import { useServerSync, SyncStatus } from '@/hooks/useServerSync';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useMobileProtection } from '@/hooks/useMobileProtection';
import { SaveStatusIndicator, SaveStatusBanner } from '@/components/SaveStatusIndicator';

import { CycleProgressBanner } from '@/components/cycle/CycleProgressBanner';
import { ToastAction } from '@/components/ui/toast';

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
  
  // New worksheet fields
  const [weeklyScratchPad, setWeeklyScratchPad] = useState('');
  const [goalCheckinNotes, setGoalCheckinNotes] = useState('');
  const [alignmentReflection, setAlignmentReflection] = useState('');
  const [alignmentRating, setAlignmentRating] = useState<number | null>(null);
  const [cycleData, setCycleData] = useState<any>(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [metricTrends, setMetricTrends] = useState<any>(null);
  
  // New enhanced section data
  const [contextPull, setContextPull] = useState<any>(null);
  const [executionSummary, setExecutionSummary] = useState<any>(null);
  const [previousCTFAR, setPreviousCTFAR] = useState<any>(null);
  const [weeklyAlignmentAverage, setWeeklyAlignmentAverage] = useState<number | null>(null);
  const [focusProgressRating, setFocusProgressRating] = useState<number | null>(null);
  const [focusConfidenceRating, setFocusConfidenceRating] = useState<number | null>(null);
  const [focusProgressWhy, setFocusProgressWhy] = useState('');
  
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
    weeklyScratchPad,
    goalCheckinNotes,
    alignmentReflection,
    alignmentRating,
  }), [weekId, priorities, thought, feeling, challenges, adjustments, metric1Target, metric2Target, metric3Target, weeklyScratchPad, goalCheckinNotes, alignmentReflection, alignmentRating]);

  // Track if we have unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastDataHashRef = useRef<string | null>(null);

  // 1. Immediate localStorage sync (0ms delay)
  const localStorageKey = `weekly_plan_backup_${weekId || 'pending'}`;
  const { save: saveToLocal, load: loadFromLocal, clear: clearLocal } = useLocalStorageSync<typeof worksheetData>({
    key: localStorageKey,
    enableIndexDBFallback: true,
  });

  // 2. Debounced server sync (1 second delay)
  const {
    sync: syncToServer,
    syncNow: saveNow,
    status: saveStatus,
    isOnline,
    lastSynced: lastSaved,
  } = useServerSync<typeof worksheetData>({
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
          weekly_scratch_pad: data.weeklyScratchPad,
          goal_checkin_notes: data.goalCheckinNotes,
          alignment_reflection: data.alignmentReflection,
          alignment_rating: data.alignmentRating,
        },
      });
      if (fnError) throw fnError;
    },
    delay: 1000,
    maxRetries: 3,
    retryDelay: 5000,
    onSuccess: () => {
      clearLocal();
      setHasUnsavedChanges(false);
    },
  });

  // 3. Warn before closing with unsaved changes
  useBeforeUnload({
    hasUnsavedChanges,
    onFinalSave: () => {
      if (weekId) {
        const backup = {
          data: worksheetData,
          timestamp: new Date().toISOString(),
          version: '2.0',
        };
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(backup));
        } catch (e) {
          console.error('[WeeklyPlan] Final save failed:', e);
        }
      }
    },
    enabled: true,
  });

  // 4. Force save on mobile when app is backgrounded
  useMobileProtection({
    getData: () => weekId ? worksheetData : null,
    onSave: (data) => {
      saveToLocal(data);
      if (isOnline) {
        syncToServer(data);
      }
    },
    enabled: worksheetLoaded && !!weekId,
  });

  // Register data changes - immediate localStorage + debounced server save
  useEffect(() => {
    if (!worksheetLoaded || isInitialLoadRef.current || !weekId) return;
    
    const dataHash = JSON.stringify(worksheetData);
    if (lastDataHashRef.current === dataHash) return;
    lastDataHashRef.current = dataHash;
    
    setHasUnsavedChanges(true);
    
    // Immediate localStorage save (0ms)
    saveToLocal(worksheetData);
    
    // Debounced server save (1s)
    syncToServer(worksheetData);
  }, [worksheetData, worksheetLoaded, weekId, saveToLocal, syncToServer]);

  // Try to restore from localStorage on initial load
  useEffect(() => {
    const tryRestoreBackup = async () => {
      if (!weekId || !worksheetLoaded) return;
      
      const backup = await loadFromLocal();
      if (backup && backup.week_id === weekId) {
        toast({
          title: '📋 Unsaved changes found',
          description: 'Would you like to restore your previous work?',
          action: (
            <ToastAction altText="Restore" onClick={() => {
              if (backup.priorities) setPriorities([
                backup.priorities[0] || '',
                backup.priorities[1] || '',
                backup.priorities[2] || '',
              ]);
              if (backup.thought) setThought(backup.thought);
              if (backup.feeling) setFeeling(backup.feeling);
              if (backup.challenges) setChallenges(backup.challenges);
              if (backup.adjustments) setAdjustments(backup.adjustments);
              toast({ title: '✅ Changes restored!' });
            }}>
              Restore
            </ToastAction>
          ),
          duration: 10000,
        });
      }
    };
    
    tryRestoreBackup();
  }, [weekId, worksheetLoaded, loadFromLocal, toast]);
  
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
        
        // New worksheet fields
        setWeeklyScratchPad(normalizeString(weekData.weekly_scratch_pad));
        setGoalCheckinNotes(normalizeString(weekData.goal_checkin_notes));
        setAlignmentReflection(normalizeString(weekData.alignment_reflection));
        setAlignmentRating(weekData.alignment_rating ?? null);
        setCycleData(weekData.cycle || null);
        setWeekNumber(weekData.week_number || 1);
        setMetricTrends(weekData.metric_trends || null);
        
        // Set enhanced section data
        setContextPull(weekData.context_pull || null);
        setExecutionSummary(weekData.execution_summary || null);
        setPreviousCTFAR(weekData.previous_ctfar || null);
        setWeeklyAlignmentAverage(weekData.weekly_alignment_average ?? null);
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
        {/* 90-Day Cycle Progress */}
        <CycleProgressBanner compact />

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
          <div className="space-y-6">
            {/* Save Status Banner */}
            <SaveStatusBanner status={saveStatus} onRetry={() => saveNow(worksheetData)} />
            
            {/* Save Status Indicator */}
            <div className="flex justify-end">
              <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
            </div>

            {/* Two-column layout on desktop */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Scratch Pad */}
              <div className="space-y-6">
                <WeeklyScratchPad
                  value={weeklyScratchPad}
                  onChange={setWeeklyScratchPad}
                  onBlur={() => saveNow(worksheetData)}
                  weekId={weekId || ''}
                  userId={user?.id || ''}
                />
              </div>

              {/* Right Column - Goal Check-in & Analytics */}
              <div className="space-y-6">
                <WeeklyCycleCheckIn
                  cycle={cycleData}
                  checkinNotes={goalCheckinNotes}
                  onCheckinNotesChange={setGoalCheckinNotes}
                />
                
                <WeeklyCycleAnalytics
                  cycle={cycleData}
                  weekNumber={weekNumber}
                  metricTrends={metricTrends}
                />
              </div>
            </div>

            {/* Full Width Sections */}
            <div className="max-w-4xl mx-auto space-y-6">
              {/* NEW: Context Pull Section */}
              {contextPull && (
                <ContextPullSection
                  cycle={cycleData}
                  weekNumber={weekNumber}
                  quarterStats={contextPull.quarter_stats}
                  executionStats={contextPull.execution_stats}
                  bottleneck={contextPull.bottleneck}
                  launchStatus={contextPull.launch_status}
                />
              )}

              {/* NEW: Execution Summary Section */}
              {executionSummary && (
                <ExecutionSummarySection
                  weekStart={cycleData?.start_date || ''}
                  weekEnd={cycleData?.end_date || ''}
                  contentCreated={executionSummary.content_by_platform || []}
                  offersAndSales={executionSummary.offers_sales || { offers_count: 0, sales_count: 0, revenue: 0, streak: 0 }}
                  taskExecution={executionSummary.task_execution || { priority_completed: 0, priority_total: 0, strategic_completed: 0, strategic_total: 0 }}
                  habitGrid={executionSummary.habit_grid || []}
                />
              )}

              {/* Last Week's Priorities for Carry-Over */}
              <LastWeekPriorities
                priorities={lastWeekPriorities}
                onCarryOver={handleCarryOver}
                onDrop={handleDropPriority}
                onMarkDone={handleMarkDone}
              />

              {/* This Week's Focus */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle>This Week's Focus</CardTitle>
                    </div>
                    <CardDescription>Set your top priorities and metric targets for the week</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Top 3 Priorities */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Top 3 Weekly Priorities</Label>
                      {priorities.map((priority, idx) => (
                        <div key={idx}>
                          <Label htmlFor={`priority-${idx}`} className="text-sm text-muted-foreground">
                            Priority {idx + 1}
                          </Label>
                          <Input
                            id={`priority-${idx}`}
                            value={priority}
                            onChange={(e) => updatePriority(idx, e.target.value)}
                            placeholder="What must you accomplish this week?"
                            required={idx === 0}
                          />
                        </div>
                      ))}
                    </div>
                    
                    {/* Metric Targets */}
                    {cycleMetrics && (cycleMetrics.metric_1_name || cycleMetrics.metric_2_name || cycleMetrics.metric_3_name) && (
                      <div className="space-y-4 pt-4 border-t">
                        <Label className="text-base font-semibold">Weekly Metric Targets</Label>
                        <div className="grid gap-4 md:grid-cols-3">
                          {cycleMetrics.metric_1_name && (
                            <div>
                              <Label htmlFor="metric1" className="text-sm text-muted-foreground">
                                {cycleMetrics.metric_1_name}
                              </Label>
                              <Input
                                id="metric1"
                                type="number"
                                value={metric1Target}
                                onChange={(e) => setMetric1Target(e.target.value ? Number(e.target.value) : '')}
                                placeholder="Target"
                              />
                            </div>
                          )}
                          {cycleMetrics.metric_2_name && (
                            <div>
                              <Label htmlFor="metric2" className="text-sm text-muted-foreground">
                                {cycleMetrics.metric_2_name}
                              </Label>
                              <Input
                                id="metric2"
                                type="number"
                                value={metric2Target}
                                onChange={(e) => setMetric2Target(e.target.value ? Number(e.target.value) : '')}
                                placeholder="Target"
                              />
                            </div>
                          )}
                          {cycleMetrics.metric_3_name && (
                            <div>
                              <Label htmlFor="metric3" className="text-sm text-muted-foreground">
                                {cycleMetrics.metric_3_name}
                              </Label>
                              <Input
                                id="metric3"
                                type="number"
                                value={metric3Target}
                                onChange={(e) => setMetric3Target(e.target.value ? Number(e.target.value) : '')}
                                placeholder="Target"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Reflection */}
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

                {/* 90-Day Alignment Check (Enhanced) */}
                <AlignmentCheckSection
                  cycleGoal={cycleGoal}
                  focusArea={cycleData?.focus_area}
                  alignmentReflection={alignmentReflection}
                  alignmentRating={alignmentRating}
                  onReflectionChange={setAlignmentReflection}
                  onRatingChange={setAlignmentRating}
                  previousCTFARSession={previousCTFAR}
                  weeklyAlignmentAverage={weeklyAlignmentAverage}
                />

                {/* NEW: Focus Area Deep Dive */}
                {cycleData?.focus_area && (
                  <FocusAreaDeepDiveSection
                    focusArea={cycleData.focus_area}
                    weekNumber={weekNumber}
                    focusActions={[]}
                    focusMetrics={metricTrends ? [
                      { name: cycleData.metric_1_name, current: metricTrends.metric_1?.current, previous: metricTrends.metric_1?.previous, trend: (metricTrends.metric_1?.current > metricTrends.metric_1?.previous ? 'up' : metricTrends.metric_1?.current < metricTrends.metric_1?.previous ? 'down' : 'stable') as 'up' | 'down' | 'stable' },
                      { name: cycleData.metric_2_name, current: metricTrends.metric_2?.current, previous: metricTrends.metric_2?.previous, trend: (metricTrends.metric_2?.current > metricTrends.metric_2?.previous ? 'up' : metricTrends.metric_2?.current < metricTrends.metric_2?.previous ? 'down' : 'stable') as 'up' | 'down' | 'stable' },
                      { name: cycleData.metric_3_name, current: metricTrends.metric_3?.current, previous: metricTrends.metric_3?.previous, trend: (metricTrends.metric_3?.current > metricTrends.metric_3?.previous ? 'up' : metricTrends.metric_3?.current < metricTrends.metric_3?.previous ? 'down' : 'stable') as 'up' | 'down' | 'stable' },
                    ].filter(m => m.name) : []}
                    progressRating={focusProgressRating}
                    confidenceRating={focusConfidenceRating}
                    progressWhy={focusProgressWhy}
                    onProgressRatingChange={setFocusProgressRating}
                    onConfidenceRatingChange={setFocusConfidenceRating}
                    onProgressWhyChange={setFocusProgressWhy}
                  />
                )}

                {/* NEW: Enhanced Metrics Section */}
                {metricTrends && cycleData && (
                  <EnhancedMetricsSection
                    weekNumber={weekNumber}
                    metrics={[
                      { name: cycleData.metric_1_name, start: metricTrends.metric_1?.start, goal: metricTrends.metric_1?.goal, target: null, actual: metric1Target, previousWeek: metricTrends.metric_1?.previous, current: metricTrends.metric_1?.current, trend: metricTrends.metric_1?.current > metricTrends.metric_1?.previous ? 'up' : metricTrends.metric_1?.current < metricTrends.metric_1?.previous ? 'down' : 'stable', percentChange: null, history: metricTrends.metric_1?.history || [] },
                      { name: cycleData.metric_2_name, start: metricTrends.metric_2?.start, goal: metricTrends.metric_2?.goal, target: null, actual: metric2Target, previousWeek: metricTrends.metric_2?.previous, current: metricTrends.metric_2?.current, trend: metricTrends.metric_2?.current > metricTrends.metric_2?.previous ? 'up' : metricTrends.metric_2?.current < metricTrends.metric_2?.previous ? 'down' : 'stable', percentChange: null, history: metricTrends.metric_2?.history || [] },
                      { name: cycleData.metric_3_name, start: metricTrends.metric_3?.start, goal: metricTrends.metric_3?.goal, target: null, actual: metric3Target, previousWeek: metricTrends.metric_3?.previous, current: metricTrends.metric_3?.current, trend: metricTrends.metric_3?.current > metricTrends.metric_3?.previous ? 'up' : metricTrends.metric_3?.current < metricTrends.metric_3?.previous ? 'down' : 'stable', percentChange: null, history: metricTrends.metric_3?.history || [] },
                    ]}
                    onMetricChange={(idx, value) => {
                      if (idx === 0) setMetric1Target(value);
                      else if (idx === 1) setMetric2Target(value);
                      else if (idx === 2) setMetric3Target(value);
                    }}
                  />
                )}

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
