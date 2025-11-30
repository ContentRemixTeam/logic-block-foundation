import { useState, useEffect, useCallback } from 'react';
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
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Save, CheckCircle2 } from 'lucide-react';

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
  const [deepModeNotes, setDeepModeNotes] = useState({
    win: '',
    obstacles: '',
    show_up: '',
  });
  
  // Weekly priorities
  const [weeklyPriorities, setWeeklyPriorities] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  
  // Habits
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDailyPlan();
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
        },
      });

      if (fnError) throw fnError;

      console.log('Save response:', data);
      
      setLastSaved(new Date());

      toast({
        title: 'Daily plan saved!',
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
  }, [top3, thought, feeling, selectedPriorities, deepModeNotes]);

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
        },
      });
      setLastSaved(new Date());
    } catch (error) {
      // Silent fail for auto-save
      console.error('Auto-save failed:', error);
    }
  }, [user, dayId, top3, thought, feeling, selectedPriorities, deepModeNotes, saving]);

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
                <Label htmlFor="thought">Today's Key Thought</Label>
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
    </Layout>
  );
}
