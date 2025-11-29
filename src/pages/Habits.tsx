import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

export default function Habits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [habits, setHabits] = useState<any[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [weekLogs, setWeekLogs] = useState<any[]>([]);

  useEffect(() => {
    loadHabits();
    loadWeekLogs();
  }, [user]);

  const loadHabits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadWeekLogs = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('date', dates);

      if (error) throw error;
      setWeekLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newHabitName.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('habits').insert({
        user_id: user.id,
        habit_name: newHabitName,
        category: newHabitCategory || null,
        display_order: habits.length,
      });

      if (error) throw error;

      toast({
        title: 'Habit added!',
      });

      setNewHabitName('');
      setNewHabitCategory('');
      loadHabits();
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

  const toggleHabit = async (habitId: string, date: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('toggle_habit', {
        p_user_id: user.id,
        p_habit_id: habitId,
        p_date: date,
      });

      if (error) throw error;
      loadWeekLogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getWeekDates = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      };
    });
  };

  const isCompleted = (habitId: string, date: string) => {
    return weekLogs.some(
      (log) => log.habit_id === habitId && log.date === date && log.completed
    );
  };

  const getCompletionColor = (habitId: string, date: string) => {
    const completed = isCompleted(habitId, date);
    return completed ? 'bg-success' : 'bg-muted';
  };

  const weekDates = getWeekDates();

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Habits</h1>
          <p className="text-muted-foreground">Track and manage your daily habits</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Habit</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addHabit} className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Habit name"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  required
                />
              </div>
              <div className="w-1/3">
                <Input
                  placeholder="Category (optional)"
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Week's Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <div className="text-center text-muted-foreground">
                No habits yet. Add one above!
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-8 gap-2 text-xs font-medium text-muted-foreground">
                  <div>Habit</div>
                  {weekDates.map((d) => (
                    <div key={d.date} className="text-center">
                      {d.day}
                    </div>
                  ))}
                </div>

                {/* Habits Grid */}
                {habits.map((habit) => (
                  <div key={habit.habit_id} className="grid grid-cols-8 gap-2 items-center">
                    <div className="text-sm font-medium truncate">
                      {habit.habit_name}
                    </div>
                    {weekDates.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => toggleHabit(habit.habit_id, d.date)}
                        className={`h-8 rounded ${getCompletionColor(
                          habit.habit_id,
                          d.date
                        )} transition-colors hover:opacity-80`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Habits</CardTitle>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <div className="text-center text-muted-foreground">No habits found</div>
            ) : (
              <div className="space-y-2">
                {habits.map((habit) => (
                  <div key={habit.habit_id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <div className="font-medium">{habit.habit_name}</div>
                      {habit.category && (
                        <div className="text-xs text-muted-foreground">
                          {habit.category}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
