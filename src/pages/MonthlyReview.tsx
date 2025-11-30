import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ReflectionList } from "@/components/ReflectionList";

export default function MonthlyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [month, setMonth] = useState<number>(0);

  const [wins, setWins] = useState<string[]>([""]);
  const [challenges, setChallenges] = useState<string[]>([""]);
  const [lessons, setLessons] = useState<string[]>([""]);
  const [priorities, setPriorities] = useState<string[]>([""]);
  const [monthScore, setMonthScore] = useState(5);

  const [habitConsistency, setHabitConsistency] = useState(0);
  const [cycleProgress, setCycleProgress] = useState(0);

  useEffect(() => {
    if (user) {
      loadMonthlyReview();
    }
  }, [user]);

  const loadMonthlyReview = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-monthly-review`, {
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

      setReviewId(data.review_id || null);
      setCycleId(data.cycle_id || null);
      setMonth(data.month || 0);
      setWins(Array.isArray(data.wins) && data.wins.length > 0 ? data.wins : [""]);
      setChallenges(Array.isArray(data.challenges) && data.challenges.length > 0 ? data.challenges : [""]);
      setLessons(Array.isArray(data.lessons) && data.lessons.length > 0 ? data.lessons : [""]);
      setPriorities(Array.isArray(data.priorities) && data.priorities.length > 0 ? data.priorities : [""]);
      setMonthScore(data.month_score || 5);
      setHabitConsistency(data.habit_consistency || 0);
      setCycleProgress(data.cycle_progress_percent || 0);

    } catch (error) {
      console.error("Error loading monthly review:", error);
      toast({ title: "Failed to load monthly review", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!reviewId || !cycleId) {
      toast({ title: "No active review to save", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-monthly-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          review_id: reviewId,
          cycle_id: cycleId,
          month,
          wins: wins.filter(Boolean),
          challenges: challenges.filter(Boolean),
          lessons: lessons.filter(Boolean),
          priorities: priorities.filter(Boolean),
          month_score: monthScore,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to save review: ${res.status}`);
      }

      toast({ title: "Monthly Review Saved!", description: "Your reflection has been saved." });
      navigate("/dashboard");

    } catch (error) {
      console.error("Error saving monthly review:", error);
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

  if (!reviewId) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>No Active Cycle</CardTitle>
            <CardDescription>Please create a cycle first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/cycle-setup")}>Go to Cycle Setup</Button>
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
            <h1 className="text-3xl font-bold">Monthly Review</h1>
            <p className="text-muted-foreground">Month {month} reflection and insights</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/weekly-plan")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Weekly Plan
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </div>

        {/* Progress Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Habit Consistency</CardTitle>
              <CardDescription>
                Your monthly habit completion rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={habitConsistency} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{habitConsistency}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cycle Progress</CardTitle>
              <CardDescription>
                Overall 90-day cycle completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={cycleProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{cycleProgress}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Wins */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Wins</CardTitle>
            <CardDescription>Celebrate your accomplishments this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={wins}
              onChange={setWins}
              label="Win"
              placeholder="What went well this month?"
            />
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <CardTitle>Challenges</CardTitle>
            <CardDescription>What obstacles did you face?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={challenges}
              onChange={setChallenges}
              label="Challenge"
              placeholder="What was difficult this month?"
            />
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>Lessons Learned</CardTitle>
            <CardDescription>Key insights and realizations</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={lessons}
              onChange={setLessons}
              label="Lesson"
              placeholder="What did you learn?"
            />
          </CardContent>
        </Card>

        {/* Priorities */}
        <Card>
          <CardHeader>
            <CardTitle>Priorities for Next Month</CardTitle>
            <CardDescription>What will you focus on moving forward?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={priorities}
              onChange={setPriorities}
              label="Priority"
              placeholder="What's most important next month?"
            />
          </CardContent>
        </Card>

        {/* Monthly Score */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Score</CardTitle>
            <CardDescription>Rate your overall month from 0 to 10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Slider
                value={[monthScore]}
                onValueChange={(value) => setMonthScore(value[0])}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <div className="text-3xl font-bold w-16 text-center text-primary">{monthScore}</div>
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
