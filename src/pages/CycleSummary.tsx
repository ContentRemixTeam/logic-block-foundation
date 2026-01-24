import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ReflectionList } from "@/components/ReflectionList";
import { useDataProtection } from "@/hooks/useDataProtection";
import { SaveStatusIndicator, SaveStatusBanner } from "@/components/SaveStatusIndicator";

export default function CycleSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleGoal, setCycleGoal] = useState("");

  const [overallWins, setOverallWins] = useState<string[]>([]);
  const [overallChallenges, setOverallChallenges] = useState<string[]>([]);
  const [overallLessons, setOverallLessons] = useState<string[]>([]);
  const [identityShifts, setIdentityShifts] = useState<string[]>([""]);
  const [finalResults, setFinalResults] = useState<string[]>([""]);
  const [nextCycleFocus, setNextCycleFocus] = useState<string[]>([""]);
  const [cycleScore, setCycleScore] = useState(5);
  const [overallHabitScore, setOverallHabitScore] = useState(0);

  // Track initial load to prevent auto-save on first load
  const isInitialLoadRef = useRef(true);

  // Memoize summary data for data protection
  const summaryData = useMemo(() => ({
    cycleId,
    identityShifts: identityShifts.filter(Boolean),
    finalResults: finalResults.filter(Boolean),
    nextCycleFocus: nextCycleFocus.filter(Boolean),
    cycleScore,
  }), [cycleId, identityShifts, finalResults, nextCycleFocus, cycleScore]);

  // Save function for data protection
  const handleAutoSave = useCallback(async (data: typeof summaryData) => {
    if (!data.cycleId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-cycle-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        cycle_id: data.cycleId,
        identity_shifts: data.identityShifts,
        final_results: data.finalResults,
        next_cycle_focus: data.nextCycleFocus,
        cycle_score: data.cycleScore,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to save cycle summary: ${res.status}`);
    }
  }, []);

  // Data protection hook
  const { register, saveNow, saveStatus, lastSaved } = useDataProtection({
    saveFn: handleAutoSave,
    autoSaveDelay: 2500,
    localStorageKey: `cycle_summary_backup_${cycleId}`,
    enableLocalBackup: true,
    enableBeforeUnload: true,
    maxRetries: 3,
    retryDelay: 5000,
  });

  // Register changes after initial load
  useEffect(() => {
    if (!loading && !isInitialLoadRef.current && cycleId) {
      register(summaryData);
    }
  }, [summaryData, loading, register, cycleId]);

  useEffect(() => {
    if (user) {
      loadCycleSummary();
    }
  }, [user]);

  const loadCycleSummary = async () => {
    try {
      setLoading(true);
      isInitialLoadRef.current = true;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-cycle-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load cycle summary: ${res.status}`);
      }

      const data = await res.json();

      setCycleId(data.cycle_id || null);
      setCycleGoal(data.cycle_goal || "");
      setOverallWins(Array.isArray(data.overall_wins) ? data.overall_wins : []);
      setOverallChallenges(Array.isArray(data.overall_challenges) ? data.overall_challenges : []);
      setOverallLessons(Array.isArray(data.overall_lessons) ? data.overall_lessons : []);
      setIdentityShifts(Array.isArray(data.identity_shifts) && data.identity_shifts.length > 0 ? data.identity_shifts : [""]);
      setFinalResults(Array.isArray(data.final_results) && data.final_results.length > 0 ? data.final_results : [""]);
      setNextCycleFocus(Array.isArray(data.next_cycle_focus) && data.next_cycle_focus.length > 0 ? data.next_cycle_focus : [""]);
      setCycleScore(data.cycle_score || 5);
      setOverallHabitScore(data.overall_habit_score || 0);

    } catch (error) {
      console.error("Error loading cycle summary:", error);
      toast({ title: "Failed to load cycle summary", variant: "destructive" });
    } finally {
      setLoading(false);
      // Allow auto-save after a short delay to prevent immediate trigger
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
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

  if (!cycleId) {
    return (
      <Layout>
        <Card>
          <CardHeader>
            <CardTitle>No Cycle Found</CardTitle>
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
        {/* Save Status Banner */}
        <SaveStatusBanner status={saveStatus} onRetry={saveNow} />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">90-Day Cycle Summary</h1>
            <p className="text-muted-foreground">{cycleGoal}</p>
          </div>
          <div className="flex gap-2 items-center">
            <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/monthly-review")}>
              Monthly Review
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/weekly-review")}>
              Weekly Review
            </Button>
          </div>
        </div>

        {/* Overall Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cycle Performance</CardTitle>
            <CardDescription>Your overall habit consistency across 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={overallHabitScore} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">{overallHabitScore}% habit completion</p>
          </CardContent>
        </Card>

        {/* Aggregated Wins */}
        {overallWins.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All Your Wins This Cycle</CardTitle>
              <CardDescription>Compiled from your weekly and monthly reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {overallWins.map((win, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Aggregated Lessons */}
        {overallLessons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Lessons</CardTitle>
              <CardDescription>What you learned throughout the cycle</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {overallLessons.map((lesson, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{lesson}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Identity Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>Identity Shifts</CardTitle>
            <CardDescription>How have you evolved as a person or leader?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={identityShifts}
              onChange={setIdentityShifts}
              label="Identity Shift"
              placeholder="How have you changed?"
            />
          </CardContent>
        </Card>

        {/* Final Results */}
        <Card>
          <CardHeader>
            <CardTitle>Final Results</CardTitle>
            <CardDescription>What did you accomplish? What are the tangible outcomes?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={finalResults}
              onChange={setFinalResults}
              label="Result"
              placeholder="What did you achieve?"
            />
          </CardContent>
        </Card>

        {/* Next Cycle Focus */}
        <Card>
          <CardHeader>
            <CardTitle>Next Cycle Focus</CardTitle>
            <CardDescription>What will you prioritize in your next 90 days?</CardDescription>
          </CardHeader>
          <CardContent>
            <ReflectionList
              items={nextCycleFocus}
              onChange={setNextCycleFocus}
              label="Focus Area"
              placeholder="What's next?"
            />
          </CardContent>
        </Card>

        {/* Cycle Score */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Cycle Score</CardTitle>
            <CardDescription>Rate your entire 90-day cycle from 0 to 10</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Slider
                value={[cycleScore]}
                onValueChange={(value) => setCycleScore(value[0])}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <div className="text-3xl font-bold w-16 text-center text-primary">{cycleScore}</div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => navigate("/cycle-setup")}>
            Start New 90-Day Cycle
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Cancel
            </Button>
            <Button onClick={saveNow} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Summary"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
