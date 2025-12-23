import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, Target } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ReflectionList } from "@/components/ReflectionList";

interface Belief {
  belief_id: string;
  upgraded_belief: string;
  confidence_score: number;
}

export default function WeeklyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekId, setWeekId] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<string | null>(null);

  const [wins, setWins] = useState<string[]>([""]);
  const [challenges, setChallenges] = useState<string[]>([""]);
  const [lessons, setLessons] = useState<string[]>([""]);
  const [intentions, setIntentions] = useState<string[]>([""]);
  const [weeklyScore, setWeeklyScore] = useState(5);
  const [focusReflection, setFocusReflection] = useState("");

  const [habitStats, setHabitStats] = useState({ total: 0, completed: 0, percent: 0 });
  const [cycleProgress, setCycleProgress] = useState({ total_days: 90, completed_days: 0, percent: 0 });

  // Fetch beliefs
  const { data: beliefs = [] } = useQuery<Belief[]>({
    queryKey: ['beliefs'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('get-beliefs', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      return data as Belief[];
    }
  });

  useEffect(() => {
    if (user) {
      loadWeeklyReview();
    }
  }, [user]);

  const loadWeeklyReview = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-weekly-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load review: ${res.status}`);
      }

      const data = await res.json();

      // Normalize data safely
      setWeekId(data.week_id || null);
      setFocusArea(data.focus_area || null);
      setWins(Array.isArray(data.wins) && data.wins.length > 0 ? data.wins : [""]);
      setChallenges(Array.isArray(data.challenges) && data.challenges.length > 0 ? data.challenges : [""]);
      setLessons(Array.isArray(data.lessons) && data.lessons.length > 0 ? data.lessons : [""]);
      setIntentions(Array.isArray(data.intentions) && data.intentions.length > 0 ? data.intentions : [""]);
      setWeeklyScore(data.weekly_score || 5);
      setFocusReflection(data.focus_reflection || "");
      setHabitStats(data.habit_stats || { total: 0, completed: 0, percent: 0 });
      setCycleProgress(data.cycle_progress || { total_days: 90, completed_days: 0, percent: 0 });

    } catch (error) {
      console.error("Error loading weekly review:", error);
      toast({ title: "Failed to load weekly review", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!weekId) {
      toast({ title: "No active week to save", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-weekly-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          week_id: weekId,
          wins: wins.filter(Boolean),
          challenges: challenges.filter(Boolean),
          lessons: lessons.filter(Boolean),
          intentions: intentions.filter(Boolean),
          weekly_score: weeklyScore,
          focus_reflection: focusReflection,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save review: ${res.status}`);
      }

      toast({ title: "Weekly Review Saved!", description: "Your reflection has been saved." });
      navigate("/dashboard");

    } catch (error) {
      console.error("Error saving weekly review:", error);
      toast({ title: "Failed to save review", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!weekId) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>No Active Week</CardTitle>
            <CardDescription>Please create a weekly plan first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/weekly-plan")}>Go to Weekly Plan</Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Weekly Review</h1>
            <p className="text-muted-foreground">Reflect on your week and plan ahead</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/weekly-plan")}>
              Weekly Plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/monthly-review")}>
              Monthly Review
            </Button>
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Habit Completion</CardTitle>
              <CardDescription>
                {habitStats.completed} of {habitStats.total} habits completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={habitStats.percent} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{habitStats.percent}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cycle Progress</CardTitle>
              <CardDescription>
                Day {cycleProgress.completed_days} of {cycleProgress.total_days}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={cycleProgress.percent} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{cycleProgress.percent}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Focus Area Reflection */}
        {focusArea && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Focus Area Reflection</CardTitle>
              </div>
              <CardDescription>
                Your focus this quarter: <span className="font-bold text-primary">{focusArea}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="focus-reflection">
                How did your actions this week support your {focusArea} focus?
              </Label>
              <Textarea
                id="focus-reflection"
                value={focusReflection}
                onChange={(e) => setFocusReflection(e.target.value)}
                placeholder={`Describe how you worked on ${focusArea} this week...`}
                rows={3}
                className="mt-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Wins */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Wins</CardTitle>
            <CardDescription>List moments you're proud of, big or small</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={wins}
              onChange={setWins}
              label="Win"
              placeholder="What went well this week?"
            />
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>What felt hard or draining this week?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={challenges}
              onChange={setChallenges}
              label="Challenge"
              placeholder="What was difficult?"
            />
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>Lessons Learned</CardTitle>
            <CardDescription>What did you learn about yourself or your work?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={lessons}
              onChange={setLessons}
              label="Lesson"
              placeholder="What insights did you gain?"
            />
          </CardContent>
        </Card>

        {/* Intentions */}
        <Card>
          <CardHeader>
            <CardTitle>Intentions for Next Week</CardTitle>
            <CardDescription>How do you want to show up? What's your #1 focus?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={intentions}
              onChange={setIntentions}
              label="Intention"
              placeholder="How will you approach next week?"
            />
          </CardContent>
        </Card>

        {/* Weekly Score */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Score</CardTitle>
            <CardDescription>Rate your overall week from 0 to 10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Slider
                value={[weeklyScore]}
                onValueChange={(value) => setWeeklyScore(value[0])}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <div className="text-3xl font-bold w-16 text-center text-primary">{weeklyScore}</div>
            </div>
          </CardContent>
        </Card>

        {/* Belief Strengthening */}
        {beliefs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle>Belief Strengthening</CardTitle>
              </div>
              <CardDescription>Your upgraded beliefs this week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {beliefs.slice(0, 3).map((belief) => (
                <div key={belief.belief_id} className="border-l-2 border-primary pl-3 py-2">
                  <p className="text-sm font-medium">{belief.upgraded_belief}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-24 bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${(belief.confidence_score / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {belief.confidence_score}/10
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Review"
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
