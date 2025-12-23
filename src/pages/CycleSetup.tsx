import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Target, BarChart3 } from 'lucide-react';

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

  // Business Diagnostic scores
  const [discoverScore, setDiscoverScore] = useState(5);
  const [nurtureScore, setNurtureScore] = useState(5);
  const [convertScore, setConvertScore] = useState(5);

  // Success Metrics
  const [metric1Name, setMetric1Name] = useState('');
  const [metric1Start, setMetric1Start] = useState<number | ''>('');
  const [metric2Name, setMetric2Name] = useState('');
  const [metric2Start, setMetric2Start] = useState<number | ''>('');
  const [metric3Name, setMetric3Name] = useState('');
  const [metric3Start, setMetric3Start] = useState<number | ''>('');


  // Calculate focus area based on lowest score
  const focusArea = useMemo(() => {
    const scores = { DISCOVER: discoverScore, NURTURE: nurtureScore, CONVERT: convertScore };
    let lowest = 'DISCOVER';
    let lowestValue = discoverScore;
    
    if (nurtureScore < lowestValue) {
      lowest = 'NURTURE';
      lowestValue = nurtureScore;
    }
    if (convertScore < lowestValue) {
      lowest = 'CONVERT';
    }
    
    return lowest;
  }, [discoverScore, nurtureScore, convertScore]);

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

      // Create cycle with business diagnostic
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
          discover_score: discoverScore,
          nurture_score: nurtureScore,
          convert_score: convertScore,
          focus_area: focusArea,
          metric_1_name: metric1Name || null,
          metric_1_start: metric1Start === '' ? null : metric1Start,
          metric_2_name: metric2Name || null,
          metric_2_start: metric2Start === '' ? null : metric2Start,
          metric_3_name: metric3Name || null,
          metric_3_start: metric3Start === '' ? null : metric3Start,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Your 90-Day Cycle</h1>
            <p className="text-muted-foreground">
              Define your goals and set up your habits for success
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </div>
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

          {/* Business Diagnostic */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Business Diagnostic</CardTitle>
              </div>
              <CardDescription>Where should you focus this quarter?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Rate yourself honestly on these 3 areas (1 = needs work, 10 = excellent)
              </p>

              {/* DISCOVER */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">DISCOVER</Label>
                  <span className="text-2xl font-bold text-primary">{discoverScore}</span>
                </div>
                <p className="text-sm text-muted-foreground">Do enough people know you exist?</p>
                <Slider
                  value={[discoverScore]}
                  onValueChange={(value) => setDiscoverScore(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Traffic, visibility, audience growth</p>
              </div>

              {/* NURTURE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">NURTURE</Label>
                  <span className="text-2xl font-bold text-primary">{nurtureScore}</span>
                </div>
                <p className="text-sm text-muted-foreground">Are you helping them for free effectively?</p>
                <Slider
                  value={[nurtureScore]}
                  onValueChange={(value) => setNurtureScore(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Free content, email list, building trust</p>
              </div>

              {/* CONVERT */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">CONVERT</Label>
                  <span className="text-2xl font-bold text-primary">{convertScore}</span>
                </div>
                <p className="text-sm text-muted-foreground">Are you making enough offers?</p>
                <Slider
                  value={[convertScore]}
                  onValueChange={(value) => setConvertScore(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Sales activity, pitching, closing</p>
              </div>

              {/* Focus Area Result */}
              <div className="mt-6 p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground mb-2">Your focus area this quarter:</p>
                <p className="text-3xl font-bold text-primary">{focusArea}</p>
                <p className="text-sm text-muted-foreground mt-3">
                  This is where you need the most work. Focus your efforts here for the next 90 days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Success Metrics */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Success Metrics</CardTitle>
              </div>
              <CardDescription>What 3 numbers will you track this quarter?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground space-y-3">
                <p>Choose metrics that align with your focus area. Track weekly to make data-driven decisions.</p>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-medium text-foreground">Examples by focus area:</p>
                  <ul className="space-y-1 text-xs">
                    <li><span className="font-semibold">DISCOVER:</span> Website visitors, social followers, content reach, podcast downloads</li>
                    <li><span className="font-semibold">NURTURE:</span> Email list size, open rates, engagement rate, free offer conversions</li>
                    <li><span className="font-semibold">CONVERT:</span> Offers made, sales calls booked, conversion rate, monthly revenue</li>
                  </ul>
                </div>
              </div>

              {/* Metric 1 */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <Label className="text-base font-semibold">Metric 1</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="metric1Name" className="text-sm text-muted-foreground">Name</Label>
                    <Input
                      id="metric1Name"
                      value={metric1Name}
                      onChange={(e) => setMetric1Name(e.target.value)}
                      placeholder="e.g., Email list size"
                    />
                  </div>
                  <div>
                    <Label htmlFor="metric1Start" className="text-sm text-muted-foreground">Starting Value</Label>
                    <Input
                      id="metric1Start"
                      type="number"
                      value={metric1Start}
                      onChange={(e) => setMetric1Start(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <Label className="text-base font-semibold">Metric 2</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="metric2Name" className="text-sm text-muted-foreground">Name</Label>
                    <Input
                      id="metric2Name"
                      value={metric2Name}
                      onChange={(e) => setMetric2Name(e.target.value)}
                      placeholder="e.g., Offers made per week"
                    />
                  </div>
                  <div>
                    <Label htmlFor="metric2Start" className="text-sm text-muted-foreground">Starting Value</Label>
                    <Input
                      id="metric2Start"
                      type="number"
                      value={metric2Start}
                      onChange={(e) => setMetric2Start(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g., 0"
                    />
                  </div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <Label className="text-base font-semibold">Metric 3</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="metric3Name" className="text-sm text-muted-foreground">Name</Label>
                    <Input
                      id="metric3Name"
                      value={metric3Name}
                      onChange={(e) => setMetric3Name(e.target.value)}
                      placeholder="e.g., Monthly revenue"
                    />
                  </div>
                  <div>
                    <Label htmlFor="metric3Start" className="text-sm text-muted-foreground">Starting Value</Label>
                    <Input
                      id="metric3Start"
                      type="number"
                      value={metric3Start}
                      onChange={(e) => setMetric3Start(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g., 0"
                    />
                  </div>
                </div>
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
