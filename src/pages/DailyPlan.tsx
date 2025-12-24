import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/system/LoadingState';
import { ErrorState } from '@/components/system/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeArray, normalizeString, normalizeObject } from '@/lib/normalize';
import { UsefulThoughtsModal } from '@/components/UsefulThoughtsModal';
import BeliefSelectorModal from '@/components/BeliefSelectorModal';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Save, CheckCircle2, Brain, TrendingUp, Zap, Target, Sparkles, Trash2, BookOpen } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DailyPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  
  // Plan data
  const [dayId, setDayId] = useState<string | null>(null);
  const [top3, setTop3] = useState<string[]>(['', '', '']);
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [focusArea, setFocusArea] = useState<string | null>(null);
  const [deepModeNotes, setDeepModeNotes] = useState({
    win: '',
    obstacles: '',
    show_up: '',
  });
  
  // Scratch pad
  const [scratchPadContent, setScratchPadContent] = useState('');
  const [scratchPadTitle, setScratchPadTitle] = useState('');
  const [processingTags, setProcessingTags] = useState(false);
  const scratchPadRef = useRef<HTMLTextAreaElement>(null);
  
  // Weekly priorities
  const [weeklyPriorities, setWeeklyPriorities] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  
  // Habits
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, boolean>>({});
  const [thoughtsModalOpen, setThoughtsModalOpen] = useState(false);
  const [beliefsModalOpen, setBeliefsModalOpen] = useState(false);
  const [identityAnchor, setIdentityAnchor] = useState<any>(null);

  useEffect(() => {
    loadDailyPlan();
    loadIdentityAnchor();
  }, [user]);

  const loadDailyPlan = async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('Loading daily plan...');
      
      const { data, error: fnError } = await supabase.functions.invoke('get-daily-plan');

      console.log('Daily plan response:', { hasData: Boolean(data), error: fnError });

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.data) {
        const plan = data.data;
        console.log('Plan loaded:', plan);

        setDayId(plan.day_id || null);
        setFocusArea(plan.focus_area || null);
        
        // Normalize top 3
        const normalizedTop3 = Array.isArray(plan.top_3_today)
          ? plan.top_3_today.map(String).filter(Boolean)
          : [];
        setTop3([
          normalizedTop3[0] || '',
          normalizedTop3[1] || '',
          normalizedTop3[2] || '',
        ]);

        // Normalize weekly priorities
        const normalizedWeekly = Array.isArray(plan.weekly_priorities)
          ? plan.weekly_priorities.map(String).filter(Boolean)
          : [];
        setWeeklyPriorities(normalizedWeekly);

        const normalizedSelected = Array.isArray(plan.selected_weekly_priorities)
          ? plan.selected_weekly_priorities.map(String).filter(Boolean)
          : [];
        setSelectedPriorities(normalizedSelected);

        setThought(plan.thought || '');
        setFeeling(plan.feeling || '');
        setScratchPadContent(plan.scratch_pad_content || '');
        setScratchPadTitle(plan.scratch_pad_title || '');

        // Normalize deep mode notes
        const notes = plan.deep_mode_notes || {};
        setDeepModeNotes({
          win: notes.win || '',
          obstacles: notes.obstacles || '',
          show_up: notes.show_up || '',
        });
      }

      // Load habits separately
      await loadHabits();
    } catch (error: any) {
      console.error('Error loading daily plan:', error);
      setError(error?.message || 'Failed to load daily plan');
    } finally {
      setLoading(false);
    }
  };

  const loadHabits = async () => {
    if (!user) return;

    try {
      // Load active habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order');

      if (habitsError) throw habitsError;
      setHabits(habitsData || []);

      // Load today's habit logs
      const today = new Date().toISOString().split('T')[0];
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (logsError) throw logsError;
      
      const logsMap = (logsData || []).reduce(
        (acc, log) => ({ ...acc, [log.habit_id]: log.completed }),
        {} as Record<string, boolean>
      );
      setHabitLogs(logsMap);
    } catch (error) {
      console.error('Error loading habits:', error);
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

  const updateTop3 = (idx: number, value: string) => {
    const updated = [...top3];
    updated[idx] = value;
    setTop3(updated);
  };

  const toggleHabit = async (habitId: string) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.rpc('toggle_habit', {
        p_user_id: user.id,
        p_habit_id: habitId,
        p_date: today,
      });

      if (error) throw error;
      
      setHabitLogs((prev) => ({ ...prev, [habitId]: data }));
    } catch (error: any) {
      console.error('Habit toggle error:', error);
      toast({
        title: 'Error toggling habit',
        description: error?.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dayId) return;
    
    setSaving(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('save-daily-plan', {
        body: {
          day_id: dayId,
          user_id: user.id,
          top_3_today: top3.filter((t) => t.trim()),
          selected_weekly_priorities: selectedPriorities,
          thought,
          feeling,
          deep_mode_notes: deepModeNotes,
          scratch_pad_content: scratchPadContent,
          scratch_pad_title: scratchPadTitle,
        },
      });

      if (fnError) throw fnError;

      console.log('Save response:', data);
      
      setLastSaved(new Date());

      toast({
        title: '⚡ Daily plan saved!',
        description: 'Your day is set.',
      });
    } catch (error: any) {
      console.error('SAVE ERROR:', error);
      toast({
        title: 'Error saving daily plan',
        description: error?.message || JSON.stringify(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save with debounce
  useEffect(() => {
    if (!user || !dayId || loading) return;
    
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [top3, thought, feeling, selectedPriorities, deepModeNotes, scratchPadContent, scratchPadTitle]);

  // Scratch pad auto-save (30 seconds)
  useEffect(() => {
    if (!user || !dayId || loading) return;
    
    const timer = setTimeout(() => {
      handleScratchPadSave();
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [scratchPadContent]);

  const handleScratchPadSave = useCallback(async () => {
    if (!user || !dayId) return;
    
    try {
      await supabase.functions.invoke('save-daily-plan', {
        body: {
          day_id: dayId,
          user_id: user.id,
          top_3_today: top3.filter((t) => t.trim()),
          selected_weekly_priorities: selectedPriorities,
          thought,
          feeling,
          deep_mode_notes: deepModeNotes,
          scratch_pad_content: scratchPadContent,
          scratch_pad_title: scratchPadTitle,
        },
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Scratch pad auto-save failed:', error);
    }
  }, [user, dayId, top3, thought, feeling, selectedPriorities, deepModeNotes, scratchPadContent, scratchPadTitle]);

  const handleAutoSave = useCallback(async () => {
    if (!user || !dayId || saving) return;
    
    try {
      await supabase.functions.invoke('save-daily-plan', {
        body: {
          day_id: dayId,
          user_id: user.id,
          top_3_today: top3.filter((t) => t.trim()),
          selected_weekly_priorities: selectedPriorities,
          thought,
          feeling,
          deep_mode_notes: deepModeNotes,
          scratch_pad_content: scratchPadContent,
          scratch_pad_title: scratchPadTitle,
        },
      });
      setLastSaved(new Date());
    } catch (error) {
      // Silent fail for auto-save
      console.error('Auto-save failed:', error);
    }
  }, [user, dayId, top3, thought, feeling, selectedPriorities, deepModeNotes, scratchPadContent, scratchPadTitle, saving]);

  const handleProcessTags = async () => {
    if (!user || !dayId || !scratchPadContent.trim()) return;
    
    setProcessingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scratch-pad-tags', {
        body: {
          daily_plan_id: dayId,
          scratch_pad_content: scratchPadContent,
        },
      });

      if (error) throw error;

      const processed = data?.processed || {};
      const total = (processed.tasks || 0) + (processed.ideas || 0) + (processed.thoughts || 0) + (processed.offers || 0) + (processed.wins || 0);
      
      if (total > 0) {
        const parts = [];
        if (processed.tasks > 0) parts.push(`${processed.tasks} task${processed.tasks > 1 ? 's' : ''}`);
        if (processed.ideas > 0) parts.push(`${processed.ideas} idea${processed.ideas > 1 ? 's' : ''}`);
        if (processed.thoughts > 0) parts.push(`${processed.thoughts} thought${processed.thoughts > 1 ? 's' : ''}`);
        if (processed.offers > 0) parts.push(`${processed.offers} offer${processed.offers > 1 ? 's' : ''}`);
        if (processed.wins > 0) parts.push(`${processed.wins} win${processed.wins > 1 ? 's' : ''}`);
        
        toast({
          title: "✨ Tags processed!",
          description: `Saved ${parts.join(', ')}`,
        });
      } else {
        toast({
          title: "No tags found",
          description: "Use #task, #idea, #thought, #offer, or #win to tag items",
        });
      }
    } catch (error: any) {
      console.error('Process tags error:', error);
      toast({
        title: "Error processing tags",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessingTags(false);
    }
  };

  const handleClearPad = () => {
    setScratchPadContent('');
    toast({
      title: "Scratch pad cleared",
      description: "Your scratch pad has been cleared",
    });
  };

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading daily plan..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <ErrorState
          title={error.includes('No active cycle') ? 'No Active Cycle' : 'Error Loading Daily Plan'}
          message={error}
          onRetry={loadDailyPlan}
        />
      </Layout>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Daily Plan</h1>
            <p className="text-muted-foreground">{today}</p>
          </div>
          <div className="flex gap-2 items-center">
            {lastSaved && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard'}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/habits'}>
              Habits
            </Button>
          </div>
        </div>

        {/* Focus Area Reminder */}
        {focusArea && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">🎯 This quarter: <span className="text-primary font-bold">{focusArea}</span></span>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Mode - Top 3 */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Top 3</CardTitle>
              <CardDescription>
                What are the most important things you need to accomplish today?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3.map((task, idx) => (
                <div key={idx}>
                  <Label htmlFor={`task-${idx}`}>Priority {idx + 1}</Label>
                  <Input
                    id={`task-${idx}`}
                    value={task}
                    onChange={(e) => updateTop3(idx, e.target.value)}
                    placeholder="What must you accomplish today?"
                    required={idx === 0}
                    maxLength={200}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Daily Scratch Pad */}
          <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border-dashed">
            <CardHeader>
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  ☀️ Daily Scratch Pad
                </CardTitle>
                <p className="text-sm font-medium text-primary">{today}</p>
              </div>
              <CardDescription>
                Brain dump, capture ideas, work through thoughts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scratch-title" className="text-sm text-muted-foreground">
                  Entry Title (optional)
                </Label>
                <Input
                  id="scratch-title"
                  value={scratchPadTitle}
                  onChange={(e) => setScratchPadTitle(e.target.value)}
                  placeholder="e.g., Planning Q1 Launch, Morning Thoughts, Weekly Wins"
                  className="mt-1"
                  maxLength={200}
                />
              </div>
              <Textarea
                ref={scratchPadRef}
                value={scratchPadContent}
                onChange={(e) => setScratchPadContent(e.target.value)}
                placeholder="Write freely... Use #task, #idea, #thought, #offer, #win to organize"
                className="min-h-[300px] font-mono text-sm bg-background/80 border-muted resize-y"
                onBlur={handleScratchPadSave}
              />
              <p className="text-xs text-muted-foreground">
                Quick tags: <span className="font-medium">#task</span> (add to tasks) • <span className="font-medium">#idea</span> (save idea) • <span className="font-medium">#thought</span> (save insight) • <span className="font-medium">#offer</span> (mark offer) • <span className="font-medium">#win</span> (celebrate)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleProcessTags}
                  disabled={processingTags || !scratchPadContent.trim()}
                >
                  {processingTags ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Process Tags
                    </>
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!scratchPadContent.trim()}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Pad
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear scratch pad?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear all content from your scratch pad. Make sure you have processed any tags you want to save first.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearPad}>Clear</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link to="/journal">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Past Entries
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Daily Mindset */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Mindset</CardTitle>
              <CardDescription>
                Set your intention and energy for today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="thought">Today's Key Thought</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setThoughtsModalOpen(true)}
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Browse Thoughts
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBeliefsModalOpen(true)}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Insert Belief
                    </Button>
                  </div>
                </div>
                <Input
                  id="thought"
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="What's your focus today?"
                  maxLength={500}
                />
              </div>
              <div>
                <Label htmlFor="feeling">How I Want to Feel</Label>
                <Input
                  id="feeling"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder="e.g., Energized, Calm, Productive"
                  maxLength={200}
                />
              </div>
            </CardContent>
          </Card>

          {/* Identity Anchor */}
          {identityAnchor && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Today's Identity Anchor
                </CardTitle>
                <CardDescription>
                  Remember who you are and what you stand for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold mb-4">{identityAnchor.identity_statement}</p>
                {(normalizeArray(identityAnchor.supporting_habits).length > 0 || normalizeArray(identityAnchor.supporting_actions).length > 0) && (
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    {normalizeArray(identityAnchor.supporting_habits).length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">Key Habits:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {normalizeArray(identityAnchor.supporting_habits).slice(0, 3).map((habit: string, idx: number) => (
                            <li key={idx}>{habit}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {normalizeArray(identityAnchor.supporting_actions).length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">Key Actions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {normalizeArray(identityAnchor.supporting_actions).slice(0, 3).map((action: string, idx: number) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Weekly Priorities Selector */}
          {weeklyPriorities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>This Week's Priorities</CardTitle>
                <CardDescription>
                  Select which weekly priorities you'll work on today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {weeklyPriorities.map((priority, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${idx}`}
                      checked={selectedPriorities.includes(priority)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPriorities([...selectedPriorities, priority]);
                        } else {
                          setSelectedPriorities(
                            selectedPriorities.filter((p) => p !== priority)
                          );
                        }
                      }}
                    />
                    <label htmlFor={`priority-${idx}`} className="text-sm cursor-pointer">
                      {priority}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Habits */}
          {habits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Today's Habits</CardTitle>
                <CardDescription>
                  Track your daily habits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {habits.map((habit) => (
                  <div key={habit.habit_id} className="flex items-center space-x-3">
                    <Checkbox
                      id={habit.habit_id}
                      checked={habitLogs[habit.habit_id] || false}
                      onCheckedChange={() => toggleHabit(habit.habit_id)}
                    />
                    <label
                      htmlFor={habit.habit_id}
                      className="flex-1 text-sm font-medium cursor-pointer"
                    >
                      {habit.habit_name}
                      {habit.category && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({habit.category})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Deep Mode Toggle */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setDeepMode(!deepMode)}
          >
            {deepMode ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Back to Quick Mode
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Switch to Deep Mode
              </>
            )}
          </Button>

          {/* Deep Mode Content */}
          {deepMode && (
            <Card>
              <CardHeader>
                <CardTitle>Deep Mode</CardTitle>
                <CardDescription>
                  Dig deeper into your planning and reflection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="win">What would make today a win?</Label>
                  <Textarea
                    id="win"
                    value={deepModeNotes.win}
                    onChange={(e) => setDeepModeNotes({ ...deepModeNotes, win: e.target.value })}
                    placeholder="Define success for today..."
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <div>
                  <Label htmlFor="obstacles">Obstacles & Solutions</Label>
                  <Textarea
                    id="obstacles"
                    value={deepModeNotes.obstacles}
                    onChange={(e) => setDeepModeNotes({ ...deepModeNotes, obstacles: e.target.value })}
                    placeholder="What might get in the way? How will you handle it?"
                    rows={4}
                    maxLength={500}
                  />
                </div>
                <div>
                  <Label htmlFor="show_up">How do I want to show up?</Label>
                  <Textarea
                    id="show_up"
                    value={deepModeNotes.show_up}
                    onChange={(e) => setDeepModeNotes({ ...deepModeNotes, show_up: e.target.value })}
                    placeholder="What energy and presence do you want to bring?"
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Daily Plan'
            )}
          </Button>
        </form>

        {/* Navigation Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link to="/dashboard">
              <Button variant="outline" className="w-full justify-start">
                View Dashboard →
              </Button>
            </Link>
            <Link to="/weekly-plan">
              <Button variant="outline" className="w-full justify-start">
                Weekly Plan →
              </Button>
            </Link>
            <Link to="/habits">
              <Button variant="outline" className="w-full justify-start">
                Track Habits →
              </Button>
            </Link>
            <Link to="/cycle-setup">
              <Button variant="outline" className="w-full justify-start">
                Manage 90-Day Cycle →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <UsefulThoughtsModal
        open={thoughtsModalOpen}
        onOpenChange={setThoughtsModalOpen}
        onSelect={(selectedThought) => setThought(selectedThought)}
      />
      
      <BeliefSelectorModal
        open={beliefsModalOpen}
        onOpenChange={setBeliefsModalOpen}
        onSelect={(belief) => setThought(belief)}
      />
    </Layout>
  );
}
