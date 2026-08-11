import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { MastermindFirstMove } from '@/hooks/useMastermindSuccessPath';
import {
  getMastermindStage,
  type MastermindPlanCycle,
  type MastermindResourceRecommendation,
  type MastermindStageId,
  type MastermindSuccessPathOutput,
} from '@/lib/mastermindSuccessPath';

interface SuccessPathPlanCardProps {
  cycle: MastermindPlanCycle | null | undefined;
  successPath: MastermindSuccessPathOutput | null | undefined;
  firstMoves: MastermindFirstMove[];
  selectedStageId: MastermindStageId;
  isLoading: boolean;
  onBuildPlan: () => void;
  onOpenResource: (resource: MastermindResourceRecommendation) => void;
  onAddToPlan: () => void;
}

const PLACEHOLDER_GOALS = new Set(['my 90-day goal', 'my 90 day goal', 'n']);

function getRealGoal(goal: string | null | undefined) {
  const normalized = goal?.trim().toLowerCase();
  if (!normalized || PLACEHOLDER_GOALS.has(normalized)) return null;
  return goal?.trim() ?? null;
}

/** The member-facing Success Plan: one focus, three moves, one finish line. */
export function SuccessPathPlanCard({
  cycle,
  successPath,
  firstMoves,
  selectedStageId,
  isLoading,
  onBuildPlan,
  onOpenResource,
  onAddToPlan,
}: SuccessPathPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Sparkles className="mr-2 inline h-4 w-4 animate-pulse" />
          Building your Success Plan…
        </CardContent>
      </Card>
    );
  }

  if (!cycle || !successPath) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-4 p-6">
          <Badge variant="secondary" className="text-[11px]">Start here</Badge>
          <div>
            <h2 className="text-2xl font-bold leading-tight">Choose one result for the next 90 days.</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Answer a few questions and we’ll turn your goal into one focused path, three next moves, and the smallest useful set of support.
            </p>
          </div>
          <Button onClick={onBuildPlan}>
            Build My Success Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stage = getMastermindStage(selectedStageId);
  const realGoal = getRealGoal(cycle.goal);
  const firstResource = stage.resources[0];
  const verifiedMoves = firstMoves.map((move) => move.task_text.trim()).filter(Boolean);
  const visibleMoves = verifiedMoves.length > 0 ? verifiedMoves : stage.messyActionSprint;
  const lowBatteryMove = cycle.low_energy_version?.trim();

  return (
    <Card className="overflow-hidden border-primary/30 bg-primary/5">
      <CardContent className="p-0">
        <div className="space-y-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">Your 90-day focus</Badge>
            <Badge variant="outline" className="text-[11px]">{stage.label}</Badge>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold leading-tight md:text-3xl">{stage.milestone}</h2>
            {realGoal && (
              <p className="mt-2 text-sm text-muted-foreground">This supports your goal: {realGoal}</p>
            )}
          </div>

          <div className="rounded-xl border bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this path</p>
            <p className="mt-1 text-sm leading-relaxed">
              {successPath.stageId === selectedStageId
                ? successPath.reason
                : `You chose the ${stage.label} path because it feels like the most important constraint to solve first.`}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">
              {verifiedMoves.length > 0 ? 'Your verified first moves' : 'Your next three moves'}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {visibleMoves.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border bg-background p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {lowBatteryMove && (
            <div className="rounded-xl border border-primary/20 bg-background p-4">
              <Badge variant="outline" className="text-[11px]">Low-battery version</Badge>
              <p className="mt-2 text-sm leading-relaxed">{lowBatteryMove}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                On a hard week, this smaller move still counts.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onAddToPlan}>
              Update My 90-Day Plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {firstResource && (
              <Button variant="outline" onClick={() => onOpenResource(firstResource)}>
                Open My Starting Resource
              </Button>
            )}
          </div>
        </div>

        <div className="border-t bg-background/60 px-6 py-4 md:px-8">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">You’ll know this path is working when: </span>
              {stage.definitionOfDone.join(' · ')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
