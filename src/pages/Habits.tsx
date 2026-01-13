import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Archive, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

// Local storage key for form backup
const FORM_BACKUP_KEY = 'habits_form_backup';

export default function Habits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekLogs, setWeekLogs] = useState<any[]>([]);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state for new/editing habit
  const [habitName, setHabitName] = useState('');
  const [habitCategory, setHabitCategory] = useState('');
  const [habitType, setHabitType] = useState('daily');
  const [habitDescription, setHabitDescription] = useState('');
  const [habitSuccessDefinition, setHabitSuccessDefinition] = useState('');

  // Save form to local storage
  const saveFormBackup = useCallback(() => {
    if (!isDialogOpen) return;
    try {
      localStorage.setItem(FORM_BACKUP_KEY, JSON.stringify({
        habitName,
        habitCategory,
        habitType,
        habitDescription,
        habitSuccessDefinition,
        editingId: editingHabit?.habit_id || null,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to save backup:', error);
    }
  }, [habitName, habitCategory, habitType, habitDescription, habitSuccessDefinition, editingHabit, isDialogOpen]);

  // Backup form on changes when dialog is open
  useEffect(() => {
    if (isDialogOpen && habitName) {
      saveFormBackup();
    }
  }, [habitName, habitCategory, habitType, habitDescription, habitSuccessDefinition, isDialogOpen, saveFormBackup]);

  // Clear form backup
  const clearFormBackup = () => {
    try {
      localStorage.removeItem(FORM_BACKUP_KEY);
    } catch (error) {
      console.error('Failed to clear backup:', error);
    }
  };

  // Load backup when dialog opens for new habit
  useEffect(() => {
    if (isDialogOpen && !editingHabit) {
      try {
        const stored = localStorage.getItem(FORM_BACKUP_KEY);
        if (stored) {
          const backup = JSON.parse(stored);
          // Only restore if there's actual content and it's not for a specific habit
          if (backup.habitName && !backup.editingId) {
            setHabitName(backup.habitName || '');
            setHabitCategory(backup.habitCategory || '');
            setHabitType(backup.habitType || 'daily');
            setHabitDescription(backup.habitDescription || '');
            setHabitSuccessDefinition(backup.habitSuccessDefinition || '');
            toast({
              title: '📋 Draft restored',
              description: 'Your previous habit draft has been restored.',
            });
          }
        }
      } catch (error) {
        console.error('Failed to load backup:', error);
      }
    }
  }, [isDialogOpen, editingHabit]);

  useEffect(() => {
    if (user) {
      loadHabits();
      loadWeekLogs();
    }
  }, [user]);

  const loadHabits = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load habits: ${res.status}`);
      }

      const data = await res.json();
      setHabits(data.habits || []);
    } catch (error) {
      console.error('Error loading habits:', error);
      toast({ title: "Failed to load habits", variant: "destructive" });
    } finally {
      setLoading(false);
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

  const openEditDialog = (habit: any) => {
    setEditingHabit(habit);
    setHabitName(habit.habit_name);
    setHabitCategory(habit.category || '');
    setHabitType(habit.type || 'daily');
    setHabitDescription(habit.description || '');
    setHabitSuccessDefinition(habit.success_definition || '');
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingHabit(null);
    setHabitName('');
    setHabitCategory('');
    setHabitType('daily');
    setHabitDescription('');
    setHabitSuccessDefinition('');
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Clear backup when closing without saving
      clearFormBackup();
    }
    setIsDialogOpen(open);
  };

  const handleSaveHabit = async () => {
    try {
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-habit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          habit_id: editingHabit?.habit_id || null,
          habit_name: habitName,
          category: habitCategory,
          type: habitType,
          description: habitDescription,
          success_definition: habitSuccessDefinition,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save habit: ${res.status}`);
      }

      toast({ title: editingHabit ? "Habit Updated!" : "Habit Created!" });
      setIsDialogOpen(false);
      clearFormBackup();
      loadHabits();
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    } catch (error) {
      console.error('Error saving habit:', error);
      toast({ title: "Failed to save habit", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveHabit = async (habitId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/archive-habit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ habit_id: habitId }),
      });

      if (!res.ok) {
        throw new Error(`Failed to archive habit: ${res.status}`);
      }

      toast({ title: "Habit Archived!" });
      loadHabits();
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    } catch (error) {
      console.error('Error archiving habit:', error);
      toast({ title: "Failed to archive habit", variant: "destructive" });
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Habits</h1>
            <p className="text-muted-foreground">Track and manage your daily habits</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/daily-plan")}>
              Daily Plan
            </Button>
          </div>
        </div>

        {/* Add New Habit Button */}
        <Button onClick={openNewDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Habit
        </Button>

        {/* This Week's Progress Grid */}
        <Card>
          <CardHeader>
            <CardTitle>This Week's Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
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

        {/* Your Habits List */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Habits</CardTitle>
            <CardDescription>Edit or archive your habits</CardDescription>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No habits found</div>
            ) : (
              <div className="space-y-3">
                {habits.map((habit) => (
                  <div key={habit.habit_id} className="flex items-start justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium">{habit.habit_name}</div>
                      {habit.category && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Category: {habit.category}
                        </div>
                      )}
                      {habit.description && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {habit.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(habit)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchiveHabit(habit.habit_id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Create Habit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
              <DialogDescription>
                Configure your habit details and tracking preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="habit-name">Habit Name *</Label>
                <Input
                  id="habit-name"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g., Morning Exercise"
                  required
                />
              </div>

              <div>
                <Label htmlFor="habit-type">Type</Label>
                <Select value={habitType} onValueChange={setHabitType}>
                  <SelectTrigger id="habit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="habit-category">Category</Label>
                <Input
                  id="habit-category"
                  value={habitCategory}
                  onChange={(e) => setHabitCategory(e.target.value)}
                  placeholder="e.g., Health, Mindset, Business"
                />
              </div>

              <div>
                <Label htmlFor="habit-description">Description</Label>
                <Textarea
                  id="habit-description"
                  value={habitDescription}
                  onChange={(e) => setHabitDescription(e.target.value)}
                  placeholder="What does this habit involve?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="habit-success">Success Definition</Label>
                <Textarea
                  id="habit-success"
                  value={habitSuccessDefinition}
                  onChange={(e) => setHabitSuccessDefinition(e.target.value)}
                  placeholder="What does success look like?"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveHabit} disabled={saving || !habitName}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Habit"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
