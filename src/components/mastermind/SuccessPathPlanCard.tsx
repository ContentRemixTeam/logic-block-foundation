import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

/** The member-facing Success Plan: ONE clear next step + ONE button. */
export function SuccessPathPlanCard({
  cycle,
  successPath,
  isLoading,
  onBuildPlan,
  onUsePath,
  onOpenResource,
}: SuccessPathPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Sparkles className="mr-2 inline h-4 w-4 animate-pulse" />
          Reading your 90-day plan…
        </CardContent>
      </Card>
    );
  }

  if (!cycle || !successPath) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <p className="text-lg font-semibold">Build your 90-day plan first</p>
          <p className="text-sm text-muted-foreground">
            Your Success Path is one clear next step, based on your plan answers.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={onBuildPlan}>
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
      <CardContent className="p-6">
        <Badge variant="secondary" className="mb-3 text-[11px]">
          Your Success Plan
        </Badge>
        <h2 className="text-2xl font-bold leading-tight">{stage.doThis}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Working toward: {cycle.goal}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {topResource && (
            <Button onClick={() => onOpenResource(topResource)}>
              Do it now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => onUsePath(stage.id)}>
            See the steps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
