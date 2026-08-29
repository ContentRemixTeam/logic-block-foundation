import { Bot, CheckCircle2, ClipboardCheck, KeyRound, Lock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAiStudioAccessSummary,
  getRecommendedAiProjectPack,
  getVisibleAiProjectPacks,
  type VisibleAiPackState,
} from '@/lib/mastermindAiStudio';
import type { MastermindPlanCycle, MastermindStageId } from '@/lib/mastermindSuccessPath';
import { cn } from '@/lib/utils';

interface AiStudioPlanCardProps {
  cycle: MastermindPlanCycle | null | undefined;
  selectedStageId: MastermindStageId;
  isMastermind: boolean;
  membershipTier: string | null;
  onOpenAiSettings: () => void;
}

const visibilityLabel: Record<VisibleAiPackState, string> = {
  included: 'Included',
  recommended_unlock: 'Recommended unlock',
  locked: 'Locked',
};

export function AiStudioPlanCard({
  cycle,
  selectedStageId,
  isMastermind,
  membershipTier,
  onOpenAiSettings,
}: AiStudioPlanCardProps) {
  const access = getAiStudioAccessSummary(membershipTier, isMastermind);
  const recommendedPack = getRecommendedAiProjectPack(selectedStageId, cycle);
  const visiblePacks = getVisibleAiProjectPacks(access, recommendedPack.id);

  return (
    <Card className="border-primary/20">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="w-fit">Hidden pilot</Badge>
          <Badge variant="outline" className="w-fit">{access.tierLabel}</Badge>
        </div>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            Create My AI Workspace
          </CardTitle>
          <CardDescription>
            The AI setup starts from the saved 90-day plan, then asks only for the missing business details before generating install-ready project instructions and knowledge docs.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border bg-muted/25 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Recommended from this plan</p>
                <h3 className="mt-1 break-words text-lg font-semibold leading-snug">{recommendedPack.title}</h3>
              </div>
              <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{recommendedPack.job}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">Interview focuses on</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {recommendedPack.interviewFocus.map((item) => (
                    <Badge key={item} variant="outline" className="text-[11px] capitalize">{item}</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-md bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">First supervised test</p>
                <p className="mt-2 text-sm leading-snug">{recommendedPack.firstTest}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">Cost control</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No key is needed for templates, checklists, or install instructions. Any live coaching or document generation can use the member's own OpenAI or Claude key.
            </p>
            <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onOpenAiSettings}>
              Open AI key settings
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold">What it will build</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedPack.installOutputs.map((output) => (
              <div key={output} className="rounded-lg border bg-background p-3 text-sm leading-snug">
                {output}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/25 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Project Pack access</h3>
              <p className="text-sm text-muted-foreground">{access.monthlyUnlockCopy}</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {visiblePacks.slice(0, 6).map((pack) => (
              <div key={pack.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <div className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  pack.visibility === 'locked' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                )}>
                  {pack.visibility === 'locked' ? <Lock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-semibold leading-snug">{pack.title}</p>
                    <Badge variant={pack.visibility === 'locked' ? 'outline' : 'secondary'} className="text-[11px]">
                      {visibilityLabel[pack.visibility]}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{pack.recommendedWhen}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
