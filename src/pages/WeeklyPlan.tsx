import { useState, useEffect, useCallback } from 'react';
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
import { ArrowLeft, Calendar, Loader2, Save, CheckCircle2, TrendingUp, Brain, Zap, Target, BarChart3, Clock, LayoutList } from 'lucide-react';

export default function WeeklyPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightTaskId = searchParams.get('highlightTask');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state for the new planner
  const [activeTab, setActiveTab] = useState<'planner' | 'worksheet'>('planner');
  
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
  
  useEffect(() => {
    loadWeeklyPlan();
    loadIdentityAnchor();
  }, [user]);

  // Auto-save with debounce
  useEffect(() => {
    if (!user || !weekId || loading) return;
    
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [priorities, thought, feeling, challenges, adjustments, metric1Target, metric2Target, metric3Target]);

  const loadWeeklyPlan = async () => {
    if (!user) return;

    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('get-weekly-plan');

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.data) {
        const weekData = data.data;
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

        setMetric1Target(weekData.metric_1_target ?? '');
        setMetric2Target(weekData.metric_2_target ?? '');
        setMetric3Target(weekData.metric_3_target ?? '');
      }
    } catch (error: any) {
      console.error('Error loading weekly plan:', error);
      setError(error?.message || 'Failed to load weekly plan');
    } finally {
      setLoading(false);
    }
  };

  const loadIdentityAnchor = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('get-identity-anchors');
      if (!error && data && data.length > 0) {
        setIdentityAnchor(normalizeObject(data[0], null));
      }
    } catch (error) {
      console.error('Error loading identity anchor:', error);
    }
  };

  const updatePriority = (idx: number, value: string) => {
    const updated = [...priorities];
    updated[idx] = value;
    setPriorities(updated);
  };

  const handleAutoSave = useCallback(async () => {
    if (!user || !weekId || saving) return;
    
    try {
      await supabase.functions.invoke('save-weekly-plan', {
        body: {
          week_id: weekId,
          user_id: user.id,
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
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [user, weekId, priorities, thought, feeling, challenges, adjustments, metric1Target, metric2Target, metric3Target, saving]);

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading weekly plan...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && error.includes('No active cycle')) {
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

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Weekly Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadWeeklyPlan}>Retry</Button>
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
        {activeTab === 'worksheet' && (
          <div className="space-y-6 max-w-3xl mx-auto">
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
