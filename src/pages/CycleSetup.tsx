import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';

export default function CycleSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [goal, setGoal] = useState('');
  const [why, setWhy] = useState('');
  const [identity, setIdentity] = useState('');
  const [feeling, setFeeling] = useState('');
  const [projects, setProjects] = useState<string[]>(['']);
  const [habits, setHabits] = useState<Array<{ name: string; category: string }>>([
    { name: '', category: '' },
  ]);

  const addProject = () => setProjects([...projects, '']);
  const updateProject = (idx: number, value: string) => {
    const updated = [...projects];
    updated[idx] = value;
    setProjects(updated);
  };
  const removeProject = (idx: number) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  const addHabit = () => setHabits([...habits, { name: '', category: '' }]);
  const updateHabit = (idx: number, field: 'name' | 'category', value: string) => {
    const updated = [...habits];
    updated[idx][field] = value;
    setHabits(updated);
  };
  const removeHabit = (idx: number) => {
    setHabits(habits.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 90);

      // Create cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('cycles_90_day')
        .insert({
          user_id: user.id,
          start_date: today.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          goal,
          why,
          identity,
          target_feeling: feeling,
          supporting_projects: projects.filter((p) => p.trim()),
        })
        .select()
        .maybeSingle();

      if (cycleError) throw cycleError;

      // Create habits
      const habitsToCreate = habits
        .filter((h) => h.name.trim())
        .map((h, idx) => ({
          user_id: user.id,
          habit_name: h.name,
          category: h.category || null,
          display_order: idx,
        }));

      if (habitsToCreate.length > 0) {
        const { error: habitsError } = await supabase
          .from('habits')
          .insert(habitsToCreate)
          .select();

        if (habitsError) throw habitsError;
      }

      // Create user settings (upsert to avoid conflicts)
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user.id,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (settingsError) throw settingsError;

      toast({
        title: 'Cycle created!',
        description: 'Your 90-day journey has begun.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('CYCLE ERROR:', error);
      toast({
        title: 'Error creating cycle',
        description: error?.message || JSON.stringify(error),
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
          <h1 className="text-3xl font-bold">Create Your 90-Day Cycle</h1>
          <p className="text-muted-foreground">
            Define your goals and set up your habits for success
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="goal">What do you want to achieve?</Label>
                <Input
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., Launch my product, Get healthy, Build my business"
                  required
                />
              </div>
              <div>
                <Label htmlFor="why">Why is this important to you?</Label>
                <Textarea
                  id="why"
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="Your deeper motivation..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="identity">Who do you need to become?</Label>
                <Input
                  id="identity"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="e.g., A disciplined entrepreneur, A healthy person"
                />
              </div>
              <div>
                <Label htmlFor="feeling">How do you want to feel?</Label>
                <Input
                  id="feeling"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  placeholder="e.g., Confident, Energized, Accomplished"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supporting Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.map((project, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={project}
                    onChange={(e) => updateProject(idx, e.target.value)}
                    placeholder="Project name"
                  />
                  {projects.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProject(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addProject}>
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Your Habits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {habits.map((habit, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={habit.name}
                    onChange={(e) => updateHabit(idx, 'name', e.target.value)}
                    placeholder="Habit name"
                  />
                  <Input
                    value={habit.category}
                    onChange={(e) => updateHabit(idx, 'category', e.target.value)}
                    placeholder="Category (optional)"
                    className="w-1/3"
                  />
                  {habits.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHabit(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addHabit}>
                <Plus className="mr-2 h-4 w-4" />
                Add Habit
              </Button>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Cycle →'}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
