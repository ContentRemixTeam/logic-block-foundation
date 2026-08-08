import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getMastermindStage,
  type MastermindPlanCycle,
  type MastermindStageId,
  type MastermindSuccessPathOutput,
} from '@/lib/mastermindSuccessPath';

interface SuccessPathPlanCardProps {
  cycle: MastermindPlanCycle | null | undefined;
  successPath: MastermindSuccessPathOutput | null | undefined;
  isLoading: boolean;
  onBuildPlan: () => void;
  onUsePath: (stageId: MastermindStageId) => void;
  onSubmitAskFaith: () => void;
  onEnableAi: () => void;
}

export function SuccessPathPlanCard({
  cycle,
  successPath,
  isLoading,
  onBuildPlan,
  onUsePath,
  onSubmitAskFaith,
  onEnableAi,
}: SuccessPathPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading your 90-day plan...
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
            The Success Path uses your saved planner answers to choose a bottleneck, next move, and support path.
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

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <Badge variant="secondary" className="w-fit">
              Based on your 90-day plan
            </Badge>
            <div>
              <CardTitle className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 break-words leading-snug">Suggested path: {stage.label}</span>
              </CardTitle>
              <CardDescription>{stage.memberQuestion}</CardDescription>
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onUsePath(stage.id)}>
              Use This Path
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto" onClick={onEnableAi}>
              <Bot className="mr-2 h-4 w-4" />
              Enable Faith AI
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs font-semibold text-muted-foreground">90-day result</p>
            <p className="mt-2 break-words font-medium leading-snug">{cycle.goal}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="break-words">{formatCycleRange(cycle.start_date, cycle.end_date)}</span>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">Why this path</p>
              <Badge variant="outline" className="capitalize">{successPath.confidence} confidence</Badge>
            </div>
            <p className="mt-2 break-words text-sm font-medium">{successPath.evidenceLabel}</p>
            <p className="mt-2 break-words text-sm text-muted-foreground">{successPath.reason}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Next money move</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{stage.nextMoneyMove}</p>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Messy action sprint</p>
              <div className="mt-3 grid gap-2">
                {stage.messyActionSprint.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 text-sm">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <span className="min-w-0 break-words">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Ask Faith question</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{stage.supportPrompt}</p>
              <Button variant="secondary" className="mt-4 w-full" onClick={onSubmitAskFaith}>
                Submit to Ask Faith
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Recommended resources</p>
              <p className="mt-1 text-xs text-muted-foreground">Start with 1-3. Do not turn this into vault wandering.</p>
              <div className="mt-3 space-y-2">
                {stage.resources.slice(0, 3).map((resource) => (
                  <div key={resource.title} className="rounded-md bg-muted/50 p-3">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-medium leading-snug">{resource.title}</p>
                      <Badge variant="outline" className="shrink-0 text-[11px]">{resource.access}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{resource.useWhen}</p>
                    {resource.portalPath && (
                      <p className="mt-2 break-words text-[11px] font-medium text-muted-foreground">
                        {resource.portalPath}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCycleRange(startDate: string, endDate: string) {
  try {
    return `${format(parseISO(startDate), 'MMM d, yyyy')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`;
  } catch {
    return 'Current 90-day cycle';
  }
}
