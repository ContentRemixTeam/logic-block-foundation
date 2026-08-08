import { format, parseISO } from 'date-fns';
import { ArrowRight, Bot, Calendar, Sparkles, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  isLoading: boolean;
  onBuildPlan: () => void;
  onUsePath: (stageId: MastermindStageId) => void;
  onOpenResource: (resource: MastermindResourceRecommendation) => void;
  onSubmitAskFaith: () => void;
  onEnableAi: () => void;
}

export function SuccessPathPlanCard({
  cycle,
  successPath,
  isLoading,
  onBuildPlan,
  onUsePath,
  onOpenResource,
  onSubmitAskFaith,
  onEnableAi,
}: SuccessPathPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Reading your 90-day plan…
        </CardContent>
      </Card>
    );
  }

  if (!cycle || !successPath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Build your 90-day plan first
          </CardTitle>
          <CardDescription>
            Your Success Path comes from your plan answers — one clear next step, no guessing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full sm:w-auto" onClick={onBuildPlan}>
            Build 90-Day Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stage = getMastermindStage(successPath.stageId);
  const topResource = stage.resources[0];

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Badge variant="secondary" className="w-fit text-[11px]">
              Based on your 90-day plan
            </Badge>
            <CardTitle className="flex items-start gap-2 text-xl leading-snug">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 break-words">Your next step: {stage.label}</span>
            </CardTitle>
            <CardDescription className="text-sm">{stage.memberQuestion}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your 90-day goal</p>
            <p className="mt-1.5 break-words text-sm font-medium leading-snug">{cycle.goal}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatCycleRange(cycle.start_date, cycle.end_date)}</span>
            </div>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why this</p>
            <p className="mt-1.5 break-words text-sm leading-snug">{successPath.evidenceLabel}</p>
          </div>
        </div>

        <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" />
            Do this this week
          </p>
          <p className="mt-1.5 break-words text-sm text-muted-foreground leading-snug">{stage.nextMoneyMove}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {topResource && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Start with</p>
                <p className="break-words text-sm font-medium leading-snug">{topResource.title}</p>
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {topResource && (
              <Button size="sm" variant="outline" onClick={() => onOpenResource(topResource)}>
                Open
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={onSubmitAskFaith}>
              Ask Faith
            </Button>
            <Button size="sm" onClick={() => onUsePath(stage.id)}>
              Use this path
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
          Want help breaking this down?{' '}
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={onEnableAi}>
            Enable Faith AI
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCycleRange(startDate: string, endDate: string) {
  try {
    return `${format(parseISO(startDate), 'MMM d')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`;
  } catch {
    return 'Current 90-day cycle';
  }
}
