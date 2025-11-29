import { useState, useEffect } from 'react';
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

export default function WeeklyPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentCycle, setCurrentCycle] = useState<any>(null);
  const [priorities, setPriorities] = useState<string[]>(['', '', '']);
  const [thought, setThought] = useState('');
  const [feeling, setFeeling] = useState('');
  const [challenges, setChallenges] = useState('');
  const [adjustments, setAdjustments] = useState('');

  useEffect(() => {
    loadCurrentCycle();
  }, [user]);

  const loadCurrentCycle = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_current_cycle', {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setCurrentCycle(data[0]);
      }
    } catch (error) {
      console.error('Error loading cycle:', error);
    }
  };

  const updatePriority = (idx: number, value: string) => {
    const updated = [...priorities];
    updated[idx] = value;
    setPriorities(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentCycle) return;
    setLoading(true);

    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

      const { error } = await supabase.from('weekly_plans').insert({
        user_id: user.id,
        cycle_id: currentCycle.cycle_id,
        start_of_week: startOfWeek.toISOString().split('T')[0],
        top_3_priorities: priorities.filter((p) => p.trim()),
        weekly_thought: thought,
        weekly_feeling: feeling,
        challenges,
        adjustments,
      });

      if (error) throw error;

      toast({
        title: 'Weekly plan created!',
        description: 'Your priorities have been set.',
      });

      // Reset form
      setPriorities(['', '', '']);
      setThought('');
      setFeeling('');
      setChallenges('');
      setAdjustments('');
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

  if (!currentCycle) {
    return (
      <Layout>
        <div className="text-center">
          <p className="text-muted-foreground">No active cycle found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Weekly Plan</h1>
          <p className="text-muted-foreground">
            Set your top 3 priorities for this week
          </p>
        </div>

        <Card className="bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">
              90-Day Goal
            </div>
            <div className="text-lg font-semibold">{currentCycle.goal}</div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top 3 Weekly Priorities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="thought">Key Thought for the Week</Label>
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
                  placeholder="What needs to change?"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Weekly Plan'}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
