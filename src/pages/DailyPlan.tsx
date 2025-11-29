import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function DailyPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  
  const [top3, setTop3] = useState<string[]>(['', '', '']);
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, boolean>>({});
  const [weeklyPriorities, setWeeklyPriorities] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load habits
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
      const logsMap = logsData?.reduce(
        (acc, log) => ({ ...acc, [log.habit_id]: log.completed }),
        {}
      ) || {};
      setHabitLogs(logsMap);

      // Load current week priorities
      const cycleData = await supabase.rpc('get_current_cycle', {
        p_user_id: user.id,
      });
      if (cycleData.data && cycleData.data.length > 0) {
        const weekData = await supabase.rpc('get_current_week', {
          p_cycle_id: cycleData.data[0].cycle_id,
        });
        if (weekData.data && weekData.data.length > 0) {
          const priorities = weekData.data[0].top_3_priorities;
          setWeeklyPriorities(Array.isArray(priorities) ? priorities : []);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
      
      toast({
        title: data ? 'Habit completed!' : 'Habit unchecked',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.rpc('create_daily_plan', {
        p_user_id: user.id,
        p_date: today,
        p_top_3_today: top3.filter((t) => t.trim()),
        p_thought: thought,
        p_feeling: feeling,
        p_selected_weekly_priorities: selectedPriorities,
      });

      if (error) throw error;

      toast({
        title: 'Daily plan saved!',
        description: 'Your day is set.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Daily Plan</h1>
          <p className="text-muted-foreground">Plan and execute your day</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Top 3</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3.map((task, idx) => (
                <div key={idx}>
                  <Label htmlFor={`task-${idx}`}>Task {idx + 1}</Label>
                  <Input
                    id={`task-${idx}`}
                    value={task}
                    onChange={(e) => updateTop3(idx, e.target.value)}
                    placeholder="What must you accomplish today?"
                    required={idx === 0}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Mindset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="thought">Today's Thought</Label>
                <Input
                  id="thought"
                  value={thought}
                  onChange={(e) => setThought(e.target.value)}
                  placeholder="What's your focus today?"
                />
              </div>
              <div>
                <Label htmlFor="feeling">How I Want to Feel</Label>
                <Input
                  id="feeling"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder="e.g., Energized, Calm, Productive"
                />
              </div>
            </CardContent>
          </Card>

          {/* Weekly Priorities Selector */}
          {weeklyPriorities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>This Week's Priorities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weeklyPriorities.map((priority: string, idx: number) => (
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
                    <label htmlFor={`priority-${idx}`} className="text-sm">
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
                      className="flex-1 text-sm font-medium"
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
                Hide Deep Mode
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show Deep Mode
              </>
            )}
          </Button>

          {/* Deep Mode Content */}
          {deepMode && (
            <Card>
              <CardHeader>
                <CardTitle>Deep Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="obstacles">Obstacles & Solutions</Label>
                  <Textarea
                    id="obstacles"
                    placeholder="What might get in the way? How will you handle it?"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="journal">Journal</Label>
                  <Textarea
                    id="journal"
                    placeholder="Free-form thoughts..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Daily Plan'}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
