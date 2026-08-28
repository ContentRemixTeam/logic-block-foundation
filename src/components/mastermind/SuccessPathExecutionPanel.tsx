import { ArrowRight, CheckCircle2, ClipboardCheck, Clock, HelpCircle, PlayCircle, Sparkles, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CurriculumPlaylistItem, MastermindWorkspaceDraft } from '@/lib/mastermindWorkspace';

interface SuccessPathExecutionPanelProps {
  draft: MastermindWorkspaceDraft;
  onAskFaith: () => void;
  onBuildAI: () => void;
}

export function SuccessPathExecutionPanel({ draft, onAskFaith, onBuildAI }: SuccessPathExecutionPanelProps) {
  const stage = draft.currentStage;
  const primaryResource = stage.resources[0];
  const quickWin = draft.quickWin;

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
          <CardTitle className="text-2xl leading-tight">Start here: {quickWin.title}</CardTitle>
          <CardDescription>
            Do this before opening another training. The playlist below exists to support this move, not to create more homework.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div className="rounded-lg border bg-background/85 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px]">Quick Win Generator</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {quickWin.timeBox}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug">{quickWin.action}</p>
            <p className="mt-3 text-sm text-muted-foreground">Low-energy version: {quickWin.lowEnergyVersion}</p>
            <Button type="button" className="mt-4">
              Review quick win
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <LoopStep title="Why this focus" value={draft.successPathGuidance.pathDecision} />
            <LoopStep title="Done enough" value={draft.successPathGuidance.doneEnough} />
            <LoopStep title="Bring back" value={quickWin.evidence} />
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <PlaylistCard
          title="Fundamentals"
          description="The short operating-system playlist everyone should understand before trying to use the whole portal."
          items={draft.fundamentalsPlaylist}
        />
        <PlaylistCard
          title="Recommended for this 90-day plan"
          description={`A short ${stage.label} playlist chosen because of the current bottleneck and quick win.`}
          items={draft.recommendedPlaylist}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-4 w-4 text-primary" />
              {draft.trainingLibrary.title}
            </CardTitle>
            <CardDescription>{draft.trainingLibrary.relationship}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <LibraryLane title="Core curriculum videos" value={draft.trainingLibrary.coreCurriculum} />
            <LibraryLane title="Recommended for this 90-day plan" value={draft.trainingLibrary.planPlaylist} />
            <LibraryLane title="Current 30-day replays" value={draft.trainingLibrary.currentReplays} />
            <LibraryLane title="Vault boundary" value={draft.trainingLibrary.vaultBoundary} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Primary resource
            </CardTitle>
            <CardDescription>Use this first if you need help doing the quick win.</CardDescription>
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

function PlaylistCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: CurriculumPlaylistItem[];
}) {
  return (
    <Card data-guidance-playlist>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PlayCircle className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={item.resourceId} className="rounded-lg border bg-background/85 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
              <Badge variant={item.label === 'Fundamental' ? 'secondary' : 'outline'} className="text-[11px]">
                {item.label}
              </Badge>
              <Badge variant="outline" className="text-[11px]">{item.access}</Badge>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.useWhen}</p>
            <p className="mt-2 text-xs font-medium leading-snug">After watching: {item.afterWatching}</p>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full">
          Open playlist
        </Button>
      </CardContent>
    </Card>
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

function LibraryLane({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background/85 p-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
