import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";

export default function WeeklyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekId, setWeekId] = useState<string | null>(null);

  const [wins, setWins] = useState<string[]>([""]);
  const [challenges, setChallenges] = useState<string[]>([""]);
  const [lessons, setLessons] = useState<string[]>([""]);
  const [intentions, setIntentions] = useState<string[]>([""]);
  const [weeklyScore, setWeeklyScore] = useState(5);

  const [habitStats, setHabitStats] = useState({ total: 0, completed: 0, percent: 0 });
  const [cycleProgress, setCycleProgress] = useState({ total_days: 90, completed_days: 0, percent: 0 });

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
      setWins(Array.isArray(data.wins) && data.wins.length > 0 ? data.wins : [""]);
      setChallenges(Array.isArray(data.challenges) && data.challenges.length > 0 ? data.challenges : [""]);
      setLessons(Array.isArray(data.lessons) && data.lessons.length > 0 ? data.lessons : [""]);
      setIntentions(Array.isArray(data.intentions) && data.intentions.length > 0 ? data.intentions : [""]);
      setWeeklyScore(data.weekly_score || 5);
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
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save review: ${res.status}`);
      }

      toast({ title: "Weekly Review Saved!" });
      navigate("/dashboard");

    } catch (error) {
      console.error("Error saving weekly review:", error);
      toast({ title: "Failed to save review", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ""]);
  };

  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => (i === index ? value : item)));
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
            <p className="text-muted-foreground">Reflect on your week</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate("/weekly-plan")}>
              Weekly Plan
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

        {/* Wins */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Wins</CardTitle>
            <CardDescription>What went well this week?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {wins.map((win, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={win}
                  onChange={(e) => updateField(setWins, index, e.target.value)}
                  placeholder="Enter a win..."
                />
                {wins.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(setWins, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addField(setWins)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Win
            </Button>
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>What felt hard this week?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {challenges.map((challenge, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={challenge}
                  onChange={(e) => updateField(setChallenges, index, e.target.value)}
                  placeholder="Enter a challenge..."
                />
                {challenges.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(setChallenges, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addField(setChallenges)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Challenge
            </Button>
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>Lessons Learned</CardTitle>
            <CardDescription>What did you learn about yourself or your work?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lessons.map((lesson, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={lesson}
                  onChange={(e) => updateField(setLessons, index, e.target.value)}
                  placeholder="Enter a lesson..."
                />
                {lessons.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(setLessons, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addField(setLessons)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lesson
            </Button>
          </CardContent>
        </Card>

        {/* Intentions */}
        <Card>
          <CardHeader>
            <CardTitle>Intentions for Next Week</CardTitle>
            <CardDescription>How do you want to show up?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {intentions.map((intention, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={intention}
                  onChange={(e) => updateField(setIntentions, index, e.target.value)}
                  placeholder="Enter an intention..."
                />
                {intentions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(setIntentions, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addField(setIntentions)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Intention
            </Button>
          </CardContent>
        </Card>

        {/* Weekly Score */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Score</CardTitle>
            <CardDescription>Rate your week from 0 to 10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Slider
                value={[weeklyScore]}
                onValueChange={(value) => setWeeklyScore(value[0])}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <div className="text-2xl font-bold w-12 text-center">{weeklyScore}</div>
            </div>
          </CardContent>
        </Card>

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
