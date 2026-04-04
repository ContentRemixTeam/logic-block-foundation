import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Target, Brain, MessageSquare, Plus, Trash2, Save, Loader2,
  TrendingUp, AlertTriangle, Sparkles
} from 'lucide-react';
import {
  useWeeklyTactics,
  useWeeklyScorecard,
  calculateExecutionScore,
  type WeeklyTactic,
} from '@/hooks/useWeeklyScorecard';

interface WeeklyScorecardFormProps {
  cycleId: string;
  weekNumber: number;
}

export function WeeklyScorecardForm({ cycleId, weekNumber }: WeeklyScorecardFormProps) {
  const { tactics, isLoading: tacticsLoading, upsertTactic, deleteTactic } = useWeeklyTactics(cycleId);
  const { scorecard, isLoading: scorecardLoading, upsertScorecard } = useWeeklyScorecard(cycleId, weekNumber);

  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [beliefScore, setBeliefScore] = useState(7);
  const [reflection, setReflection] = useState('');
  const [sprintPhase, setSprintPhase] = useState<string>('phase_1');
  const [newTacticText, setNewTacticText] = useState('');
  const [isEditingTactics, setIsEditingTactics] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing scorecard data
  useEffect(() => {
    if (scorecard) {
      setCompletions(scorecard.tactic_completions || {});
      setBeliefScore(scorecard.belief_score ?? 7);
      setReflection(scorecard.reflection_text ?? '');
      setSprintPhase(scorecard.sprint_phase ?? 'phase_1');
    }
  }, [scorecard]);

  const executionScore = calculateExecutionScore(completions, tactics);

  const handleToggleTactic = (tacticId: string) => {
    setCompletions(prev => ({ ...prev, [tacticId]: !prev[tacticId] }));
  };

  const handleAddTactic = async () => {
    if (!newTacticText.trim()) return;
    await upsertTactic.mutateAsync({
      tactic_text: newTacticText.trim(),
      sort_order: tactics.length,
    });
    setNewTacticText('');
    toast.success('Tactic added');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertScorecard.mutateAsync({
        tactic_completions: completions,
        execution_score: executionScore,
        belief_score: beliefScore,
        reflection_text: reflection || null,
        sprint_phase: sprintPhase,
      });
      toast.success('Scorecard saved! 🎯');
    } catch {
      toast.error('Failed to save scorecard');
    } finally {
      setSaving(false);
    }
  };

  const getExecutionColor = (score: number) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 65) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getExecutionMessage = (score: number) => {
    if (score >= 85) return "You're showing up. Keep this energy. 🔥";
    if (score >= 65) return "Good momentum — push a little harder this week.";
    return "Something is blocking you. Let's look at what's in the way.";
  };

  const getBeliefMessage = (score: number) => {
    if (score >= 8) return "Strong belief. You're in flow.";
    if (score >= 5) return "Steady. Keep gathering evidence.";
    return "Your belief dropped. This is the moment most people quit. Let's work through it.";
  };

  if (tacticsLoading || scorecardLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* EXECUTION SCORE — Tactic Checklist */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Execution Score
            </span>
            <span className={cn("text-3xl font-bold tabular-nums", getExecutionColor(executionScore))}>
              {executionScore}%
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{getExecutionMessage(executionScore)}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {tactics.length === 0 && !isEditingTactics ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">No weekly tactics defined yet.</p>
              <Button variant="outline" size="sm" onClick={() => setIsEditingTactics(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your Weekly Tactics
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {tactics.map((tactic) => (
                <motion.div
                  key={tactic.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 py-2"
                >
                  <Checkbox
                    checked={!!completions[tactic.id]}
                    onCheckedChange={() => handleToggleTactic(tactic.id)}
                    className="h-5 w-5"
                  />
                  <span className={cn(
                    "flex-1 text-sm transition-all",
                    completions[tactic.id] && "line-through text-muted-foreground"
                  )}>
                    {tactic.tactic_text}
                  </span>
                  {isEditingTactics && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTactic.mutate(tactic.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Add tactic */}
          {(isEditingTactics || tactics.length > 0) && (
            <div className="pt-2 border-t space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a weekly tactic (e.g. 'Post on LinkedIn 3x')"
                  value={newTacticText}
                  onChange={e => setNewTacticText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTactic()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleAddTactic} disabled={!newTacticText.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {!isEditingTactics && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingTactics(true)} className="text-xs">
                  Edit tactics
                </Button>
              )}
              {isEditingTactics && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingTactics(false)} className="text-xs">
                  Done editing
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MOMENTUM SCORE — Sprint Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Momentum Score
          </CardTitle>
          <p className="text-sm text-muted-foreground">Your monthly Messy Action Sprint progress</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {['phase_1', 'phase_2', 'phase_3'].map((phase, i) => {
              const phaseLabels = ['Phase 1: Draft', 'Phase 2: Refine', 'Phase 3: Ship'];
              const isCompleted = ['phase_2', 'phase_3', 'complete'].indexOf(sprintPhase) > i - 1 &&
                sprintPhase !== 'phase_1' ? true :
                phase === 'phase_1' && ['phase_1', 'phase_2', 'phase_3', 'complete'].includes(sprintPhase) ? 
                  sprintPhase !== 'phase_1' || i === 0 : false;
              
              // Simplified: mark phases up to and including current
              const phaseIndex = ['phase_1', 'phase_2', 'phase_3', 'complete'].indexOf(sprintPhase);
              const thisIndex = i;
              const isDone = phaseIndex > thisIndex;
              const isCurrent = phaseIndex === thisIndex;

              return (
                <button
                  key={phase}
                  onClick={() => setSprintPhase(phase)}
                  className={cn(
                    "flex-1 p-3 rounded-lg border-2 text-center transition-all text-xs font-medium",
                    isDone && "bg-green-500/10 border-green-500/50 text-green-600",
                    isCurrent && "bg-primary/10 border-primary/50 text-primary ring-2 ring-primary/20",
                    !isDone && !isCurrent && "bg-muted/50 border-muted text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {isDone ? '✅ ' : isCurrent ? '📍 ' : ''}{phaseLabels[i]}
                </button>
              );
            })}
          </div>
          {sprintPhase !== 'phase_1' && (
            <div className="mt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-green-600"
                onClick={() => setSprintPhase('complete')}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Mark Sprint Complete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BELIEF CHECK */}
      <Card className={cn(
        "transition-all",
        beliefScore < 5 && "border-2 border-amber-500/50 bg-amber-500/5"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Belief Check
            <Badge variant="outline" className={cn(
              "ml-auto text-lg tabular-nums",
              beliefScore >= 8 && "border-green-500 text-green-600",
              beliefScore >= 5 && beliefScore < 8 && "border-yellow-500 text-yellow-600",
              beliefScore < 5 && "border-red-500 text-red-600"
            )}>
              {beliefScore}/10
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{getBeliefMessage(beliefScore)}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="px-2">
            <Slider
              value={[beliefScore]}
              onValueChange={([v]) => setBeliefScore(v)}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Struggling</span>
              <span>Confident</span>
            </div>
          </div>

          {/* Coaching moment when belief is low */}
          {beliefScore < 5 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-amber-500/10 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Your belief dropped this week.</p>
                  <p className="text-xs text-muted-foreground">
                    This is normal — especially around week 3-4. This is the exact moment most people quit.
                    But you're still here. What thought showed up this week that's getting in the way?
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* REFLECTION */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            What's on your mind this week?
          </CardTitle>
          <p className="text-sm text-muted-foreground">Optional — this feeds your self-coaching habit</p>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="One sentence about where you're at..."
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* SAVE */}
      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Week {weekNumber} Scorecard
      </Button>
    </div>
  );
}
