import { Bot, CheckCircle2, ClipboardCheck, FileText, Lock, PlayCircle, Sparkles, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MastermindWorkspaceDraft, WorkspaceArtifact } from '@/lib/mastermindWorkspace';
import { cn } from '@/lib/utils';

interface MyWorkspaceDashboardProps {
  draft: MastermindWorkspaceDraft;
  onOpenSuccessPath: () => void;
  onBuildAI: () => void;
  onOpenVault: () => void;
}

export function MyWorkspaceDashboard({
  draft,
  onOpenSuccessPath,
  onBuildAI,
  onOpenVault,
}: MyWorkspaceDashboardProps) {
  const { capabilities } = draft;

  return (
    <div className="space-y-4" data-my-workspace-dashboard>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <Badge variant="secondary" className="w-fit text-[11px]">Current 90-day focus</Badge>
            <CardTitle className="text-2xl leading-tight">{draft.ninetyDayFocus}</CardTitle>
            <CardDescription>Use the next move, then record evidence before choosing more content.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <FocusMetric title="Stage" value={capabilities.mastermindCoreAccess ? draft.currentStage.label : 'Planner'} />
            <FocusMetric title="Milestone" value={draft.activeMilestone} />
            <FocusMetric title="Evidence" value={draft.evidenceTarget} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Next money move
            </CardTitle>
            <CardDescription>{draft.currentStage.messyActionSprint[0] ?? draft.currentStage.doThis}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {capabilities.mastermindCoreAccess ? (
              <Button type="button" onClick={onOpenSuccessPath}>
                Open Success Path
              </Button>
            ) : (
              <Button type="button" variant="secondary">
                Review 90-day plan
              </Button>
            )}
            <Button type="button" variant="outline">
              Add evidence
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ActionPanel
          icon={Sparkles}
          title="Success Path"
          badge={capabilities.mastermindCoreAccess ? 'Included' : 'Mastermind only'}
          description={
            capabilities.mastermindCoreAccess
              ? `${draft.currentStage.label}: ${draft.activeMilestone}`
              : 'Planner users keep planning and evidence tools without member-only curriculum.'
          }
          buttonLabel={capabilities.mastermindCoreAccess ? 'Continue path' : 'Keep planner focus'}
          locked={!capabilities.mastermindCoreAccess}
          onClick={capabilities.mastermindCoreAccess ? onOpenSuccessPath : undefined}
        />

        <ActionPanel
          icon={Bot}
          title="AI workspace"
          badge={draft.aiWorkflow.employeeName}
          description={draft.aiWorkflow.outcome}
          buttonLabel="Build AI support"
          onClick={onBuildAI}
        />

        <ActionPanel
          icon={PlayCircle}
          title="Vault and replays"
          badge={capabilities.replayVaultAccess ? 'Annual gate' : capabilities.recentReplayAccess ? '30-day only' : 'Not included'}
          description={
            capabilities.replayVaultAccess
              ? 'Hidden until search, playback, and entitlement QA pass.'
              : capabilities.recentReplayAccess
                ? 'Recent replays can be separate from the annual replay vault.'
                : 'No Mastermind replay metadata appears for this persona.'
          }
          buttonLabel={capabilities.replayVaultAccess ? 'Review Vault QA' : 'View access state'}
          locked={!capabilities.recentReplayAccess && !capabilities.replayVaultAccess}
          onClick={onOpenVault}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            What you have built
          </CardTitle>
          <CardDescription>Plans, evidence, workflows, and support stay visible in one place.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {draft.artifacts.map((artifact) => (
              <ArtifactRow key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FocusMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-background/85 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

interface ActionPanelProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  description: string;
  buttonLabel: string;
  locked?: boolean;
  onClick?: () => void;
}

function ActionPanel({ icon: Icon, title, badge, description, buttonLabel, locked = false, onClick }: ActionPanelProps) {
  return (
    <Card className={cn('h-full', locked && 'bg-muted/25')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          {locked ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit text-[11px]">{badge}</Badge>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button type="button" variant={locked ? 'secondary' : 'default'} className="w-full" onClick={onClick}>
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function ArtifactRow({ artifact }: { artifact: WorkspaceArtifact }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-lg border p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words text-sm font-semibold">{artifact.title}</p>
          <Badge variant="secondary" className="text-[11px]">{artifact.status}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{artifact.surface} · {artifact.type}</p>
        <p className="mt-2 text-sm leading-snug">{artifact.nextAction}</p>
      </div>
    </div>
  );
}
