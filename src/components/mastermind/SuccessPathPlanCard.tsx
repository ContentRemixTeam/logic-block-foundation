import { ArrowRight, CheckCircle2, Clock, PlayCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getFundamentalsPlaylist,
  getQuickWinRecommendation,
  getRecommendedPlaylist,
  type CurriculumPlaylistItem,
  type WorkspaceCapabilities,
} from '@/lib/mastermindWorkspace';
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

/** The member-facing 90-day guidance: one focus, one quick win, one watch plan. */
export function SuccessPathPlanCard({
  cycle,
  successPath,
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
          Building your 90-Day Plan...
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
              Answer a few questions and we'll turn your goal into one focus, one quick win, and the smallest useful watch plan.
            </p>
          </div>
          <Button onClick={onBuildPlan}>
            Build My 90-Day Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stage = getMastermindStage(selectedStageId);
  const realGoal = getRealGoal(cycle.goal);
  const firstResource = stage.resources[0];
  const capabilities: WorkspaceCapabilities = {
    plannerAccess: true,
    mastermindCoreAccess: true,
    recentReplayAccess: true,
    replayVaultAccess: false,
    mastermindAIAccess: true,
    adminPreview: false,
  };
  const quickWin = getQuickWinRecommendation(selectedStageId);
  const fundamentalsPlaylist = getFundamentalsPlaylist();
  const recommendedPlaylist = getRecommendedPlaylist(stage, capabilities);

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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this focus</p>
            <p className="mt-1 text-sm leading-relaxed">
              {successPath.stageId === selectedStageId
                ? successPath.reason
                : `You chose ${stage.label} because it feels like the most important constraint to solve first.`}
            </p>
          </div>

          <div className="rounded-xl border bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px]">Quick Win Generator</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {quickWin.timeBox}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-tight">{quickWin.title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{quickWin.action}</p>
            <p className="mt-3 text-sm text-muted-foreground">Evidence to bring back: {quickWin.evidence}</p>
            <p className="mt-1 text-sm text-muted-foreground">Low-energy version: {quickWin.lowEnergyVersion}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <PlaylistBlock
              title="Fundamentals"
              description="Watch these once so the planner, action rhythm, and support model make sense."
              items={fundamentalsPlaylist}
            />
            <PlaylistBlock
              title="Recommended for this 90-day plan"
              description={`The shortest useful ${stage.label} watch list before you do the quick win.`}
              items={recommendedPlaylist}
            />
          </div>

          <div className="rounded-xl border bg-background p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <PlayCircle className="h-4 w-4 text-primary" />
              Training Library
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This is where the videos live. Your 90-day plan pulls the few trainings to watch now; the full library holds core curriculum, current replays, and Vault depth only when access includes it.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onAddToPlan}>
              Update My 90-Day Plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {firstResource && (
              <Button variant="outline" onClick={() => onOpenResource(firstResource)}>
              Open Starting Resource
            </Button>
            )}
          </div>
        </div>

        <div className="border-t bg-background/60 px-6 py-4 md:px-8">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">You'll know this focus is working when: </span>
              {stage.definitionOfDone.join(' · ')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaylistBlock({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: CurriculumPlaylistItem[];
}) {
  return (
    <div className="rounded-xl border bg-background/80 p-4">
      <div className="mb-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <PlayCircle className="h-4 w-4 text-primary" />
          {title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.resourceId} className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
              <Badge variant={item.label === 'Fundamental' ? 'secondary' : 'outline'} className="text-[11px]">
                {item.label}
              </Badge>
              <Badge variant="outline" className="text-[11px]">{item.access}</Badge>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.useWhen}</p>
            <p className="mt-2 text-xs font-medium leading-snug">After watching: {item.afterWatching}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
