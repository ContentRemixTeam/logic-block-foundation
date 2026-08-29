import { ArrowRight, CheckCircle2, MessageCircle, PlayCircle, Search, Sparkles, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getMastermindWeeklyGuidance,
  type MastermindPlanCycle,
  type MastermindResourceRecommendation,
  type MastermindStageId,
  type MastermindSuccessPathOutput,
} from '@/lib/mastermindSuccessPath';

interface SuccessPathPlanCardProps {
  cycle: MastermindPlanCycle | null | undefined;
  successPath: MastermindSuccessPathOutput | null | undefined;
  selectedStageId: MastermindStageId;
  currentMilestoneId?: string | null;
  isLoading: boolean;
  onBuildPlan: () => void;
  onOpenResource: (resource: MastermindResourceRecommendation) => void;
  onAddToPlan: () => void;
  onAskFaith: () => void;
  onFindSupport: () => void;
  onOpenAiStudio?: () => void;
  aiStudioEnabled?: boolean;
}

const PLACEHOLDER_GOALS = new Set(['my 90-day goal', 'my 90 day goal', 'n']);

function getRealGoal(goal: string | null | undefined) {
  const normalized = goal?.trim().toLowerCase();
  if (!normalized || PLACEHOLDER_GOALS.has(normalized)) return null;
  return goal?.trim() ?? null;
}

export function SuccessPathPlanCard({
  cycle,
  successPath,
  selectedStageId,
  currentMilestoneId,
  isLoading,
  onBuildPlan,
  onOpenResource,
  onAddToPlan,
  onAskFaith,
  onFindSupport,
  onOpenAiStudio,
  aiStudioEnabled = false,
}: SuccessPathPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Sparkles className="mr-2 inline h-4 w-4 animate-pulse" aria-hidden="true" />
          Reading your 90-day plan...
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
            <h2 className="text-2xl font-bold leading-tight">Build your 90-day plan.</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Answer the planning questions first. Then this page will turn the plan into one weekly move, one evidence target, and the most useful training to watch next.
            </p>
          </div>
          <Button type="button" onClick={onBuildPlan}>
            Build 90-Day Plan
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const guidance = getMastermindWeeklyGuidance(selectedStageId, cycle, currentMilestoneId);
  const { stage, quickWin, primaryResource } = guidance;
  const realGoal = getRealGoal(cycle.goal);

  return (
    <Card className="overflow-hidden border-primary/30 bg-primary/5">
      <CardContent className="p-0">
        <div className="space-y-5 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">Your 90-day plan</Badge>
            <Badge variant="outline" className="text-[11px]">Current focus: {stage.label}</Badge>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold leading-tight md:text-3xl">
              {realGoal ?? stage.milestone}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This week is about the part that is most likely slowing the 90-day result down.
            </p>
          </div>

          <div className="rounded-lg border bg-background/85 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Why this is first</p>
            <p className="mt-1 text-sm leading-relaxed">
              {successPath.stageId === selectedStageId
                ? successPath.reason
                : `You chose ${stage.label} because it feels like the most important constraint to solve first.`}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold">Do this this week</p>
              </div>
              <h3 className="text-lg font-semibold leading-snug">{quickWin.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{quickWin.action}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Time box</p>
                  <p className="mt-1 text-sm">{quickWin.timeBox}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">If capacity is low</p>
                  <p className="mt-1 text-sm leading-snug">{quickWin.lowEnergy}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold">Bring back this evidence</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{quickWin.evidence}</p>
              <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onAddToPlan}>
                Update My 90-Day Plan
              </Button>
            </div>
          </div>

          {primaryResource && (
            <div className="rounded-lg border bg-background p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold">Watch if needed</p>
                    <Badge variant="outline" className="text-[11px]">{primaryResource.access}</Badge>
                  </div>
                  <h3 className="break-words text-base font-semibold leading-snug">{primaryResource.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{primaryResource.useWhen}</p>
                  {primaryResource.afterWatching && (
                    <p className="mt-2 text-sm leading-relaxed">
                      <span className="font-semibold">After watching: </span>{primaryResource.afterWatching}
                    </p>
                  )}
                </div>
                <Button type="button" variant="outline" className="w-full shrink-0 lg:w-auto" onClick={() => onOpenResource(primaryResource)}>
                  Open training
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" onClick={onFindSupport}>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Find training
            </Button>
            <Button type="button" variant="outline" onClick={onAskFaith}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Ask Faith
            </Button>
            {aiStudioEnabled && onOpenAiStudio && (
              <Button type="button" variant="secondary" onClick={onOpenAiStudio}>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Create My AI Workspace
              </Button>
            )}
          </div>
        </div>

        <div className="border-t bg-background/60 px-6 py-4 md:px-8">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm">
              <span className="font-semibold">You'll know this is working when: </span>
              {stage.definitionOfDone.join(' | ')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
