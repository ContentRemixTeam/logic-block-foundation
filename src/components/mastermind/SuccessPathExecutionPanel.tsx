import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, HelpCircle, Sparkles, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MastermindWorkspaceDraft } from '@/lib/mastermindWorkspace';

interface SuccessPathExecutionPanelProps {
  draft: MastermindWorkspaceDraft;
  onAskFaith: () => void;
  onBuildAI: () => void;
}

export function SuccessPathExecutionPanel({ draft, onAskFaith, onBuildAI }: SuccessPathExecutionPanelProps) {
  const stage = draft.currentStage;
  const firstMilestone = stage.milestones[0];
  const primaryResource = stage.resources[0];
  const sprint = draft.messyActionSprintPlan;

  if (!draft.capabilities.mastermindCoreAccess) {
    return (
      <Card data-success-path-boundary>
        <CardHeader>
          <Badge variant="outline" className="w-fit">Planner boundary</Badge>
          <CardTitle className="text-xl">90-day guidance is a Mastermind layer.</CardTitle>
          <CardDescription>
            Planner-only users can still plan, execute, review, and build their own AI context packet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary">Go to 90-day plan</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-success-path-core-loop>
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">Based on your 90-day plan</Badge>
            <Badge variant="outline" className="text-[11px]">{stage.label}</Badge>
          </div>
          <CardTitle className="text-2xl leading-tight">Your next useful move: {firstMilestone?.label ?? stage.milestone}</CardTitle>
          <CardDescription>
            This is not a second planner or a giant curriculum map. It makes the saved 90-day plan more directive: one weekly move, one evidence target, and one support route.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LoopStep title="Why this path" value={draft.successPathGuidance.pathDecision} />
          <LoopStep title="This week's move" value={draft.successPathGuidance.thisWeekMove} />
          <LoopStep title="Done enough" value={draft.successPathGuidance.doneEnough} />
          <LoopStep title="Bring back" value={draft.successPathGuidance.bringBack} />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              {sprint.title}
            </CardTitle>
            <CardDescription>{sprint.relationship}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SprintStep number="1" title="Before the live sprint" value={sprint.prepMove} />
            <SprintStep number="2" title="In the room" value={sprint.liveRoomFocus} />
            <SprintStep number="3" title="After the sprint" value={sprint.afterSprintProof} />
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">If there is no live sprint this week</p>
              <p className="mt-1 text-sm font-medium leading-snug">{sprint.ifNoLiveSprint}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Primary resource
            </CardTitle>
            <CardDescription>Use the smallest relevant lesson before the live work, not the whole library.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-background/85 p-3">
              <p className="text-sm font-semibold">{primaryResource?.title ?? draft.primaryResource}</p>
              <p className="mt-1 text-sm text-muted-foreground">{primaryResource?.useWhen ?? 'Use this only when it supports the current move.'}</p>
            </div>
            <Button type="button" variant="outline" className="w-full">
              Open assigned resource
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Later in this path
            </CardTitle>
            <CardDescription>The app should only advance after evidence is logged or the member confirms the plan changed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {stage.milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex gap-3 rounded-lg border p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{milestone.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{milestone.output}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-primary" />
              Support
            </CardTitle>
            <CardDescription>{draft.successPathGuidance.askFaithWhen}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button type="button" className="w-full" onClick={onAskFaith}>
              Ask Faith
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onBuildAI}>
              <Sparkles className="mr-2 h-4 w-4" />
              Build AI support
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function LoopStep({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/85 p-4">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm font-medium leading-snug">{value}</p>
      <CheckCircle2 className="mt-3 h-4 w-4 text-primary" />
    </div>
  );
}

function SprintStep({ number, title, value }: { number: string; title: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background/85 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {number}
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
