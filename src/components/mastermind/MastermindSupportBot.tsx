import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, Loader2, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { MastermindPortalResource } from '@/data/mastermindPortalResources';
import { parseAIJson, useMastermindAI } from '@/hooks/useMastermindAI';
import {
  MASTERMIND_SUCCESS_STAGES,
  type MastermindMilestone,
  type MastermindPlanCycle,
  type MastermindStageId,
} from '@/lib/mastermindSuccessPath';
import { searchMastermindPortalResources } from '@/lib/mastermindPortalSearch';
import { cn } from '@/lib/utils';

type SupportBotMode = 'coach' | 'find';

interface MastermindSupportBotProps {
  cycle?: MastermindPlanCycle | null;
  selectedStageId: MastermindStageId;
  currentMilestone: MastermindMilestone;
  visibleResources: MastermindPortalResource[];
  completedResourceIds: Set<string>;
  onOpenResource: (resource: MastermindPortalResource) => void;
  onOpenAiSettings: () => void;
}

interface CoachResult {
  answer?: string;
  next_move?: string;
  low_capacity_version?: string;
  evidence_to_record?: string;
  training_ids?: string[];
}

const DEFAULT_QUESTION = 'What should I focus on this week?';

function compactResource(resource: MastermindPortalResource) {
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    member_job: resource.memberJob,
    stages: resource.stages,
  };
}

function normalizeTrainingIds(ids: string[] | undefined, resources: MastermindPortalResource[]) {
  const knownIds = new Set(resources.map((resource) => resource.id));
  return (ids ?? []).filter((id) => knownIds.has(id)).slice(0, 3);
}

export function MastermindSupportBot({
  cycle,
  selectedStageId,
  currentMilestone,
  visibleResources,
  completedResourceIds,
  onOpenResource,
  onOpenAiSettings,
}: MastermindSupportBotProps) {
  const [mode, setMode] = useState<SupportBotMode>('find');
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [coachTrainingIds, setCoachTrainingIds] = useState<string[]>([]);
  const [coachError, setCoachError] = useState<string | null>(null);
  const mastermindAI = useMastermindAI();
  const selectedStage = MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === selectedStageId) ?? MASTERMIND_SUCCESS_STAGES[0];
  const searchableQuestion = question.trim() || `${selectedStage.label} ${cycle?.goal ?? ''}`;

  const finderResults = useMemo(() => {
    const stageResults = searchMastermindPortalResources(visibleResources, searchableQuestion, {
      stageId: selectedStageId,
      transcriptReadyOnly: true,
    });
    const broadResults = stageResults.length > 0
      ? stageResults
      : searchMastermindPortalResources(visibleResources, searchableQuestion, { transcriptReadyOnly: true });

    return [...broadResults]
      .sort((a, b) => {
        const watchedA = completedResourceIds.has(a.id) ? 1 : 0;
        const watchedB = completedResourceIds.has(b.id) ? 1 : 0;
        return watchedA - watchedB;
      })
      .slice(0, 3);
  }, [completedResourceIds, searchableQuestion, selectedStageId, visibleResources]);

  const coachTraining = useMemo(() => {
    const ids = normalizeTrainingIds(coachTrainingIds, visibleResources);
    if (ids.length === 0) return finderResults;
    return ids
      .map((id) => visibleResources.find((resource) => resource.id === id))
      .filter((resource): resource is MastermindPortalResource => Boolean(resource));
  }, [coachTrainingIds, finderResults, visibleResources]);

  const coachingTrainingContext = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...finderResults,
      ...visibleResources.filter((resource) => resource.stages.includes(selectedStageId)),
      ...visibleResources,
    ]
      .filter((resource) => {
        if (seen.has(resource.id)) return false;
        seen.add(resource.id);
        return true;
      })
      .slice(0, 12);
  }, [finderResults, selectedStageId, visibleResources]);

  const displayedRecommendations = mode === 'coach' ? coachTraining : finderResults;

  const runCoach = async () => {
    setMode('coach');
    setCoachError(null);
    setCoachResult(null);
    setCoachTrainingIds([]);

    try {
      const response = await mastermindAI.mutateAsync({
        temperature: 0.2,
        max_tokens: 850,
        messages: [
          {
            role: 'system',
            content: [
              'You are the embedded Mastermind support bot inside Faith Mariah\'s Planner app.',
              'Be concise, practical, and plan-aware. Do not pretend to be Faith.',
              'Return JSON only with keys: answer, next_move, low_capacity_version, evidence_to_record, training_ids.',
              'Give one next move, one low-capacity version, and one evidence_to_record.',
              'Use only training_ids from the provided available_training list. If no training fits, return an empty array.',
              'Do not change the member\'s plan. The member chooses what to use.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              member_question: question,
              current_90_day_plan: cycle,
              current_stage: {
                id: selectedStage.id,
                label: selectedStage.label,
                do_this: selectedStage.doThis,
                next_money_move: selectedStage.nextMoneyMove,
                quick_win: selectedStage.quickWin,
              },
              current_milestone: currentMilestone,
              watched_training_ids: Array.from(completedResourceIds),
              available_training: coachingTrainingContext.map(compactResource),
            }),
          },
        ],
      });

      const parsed = parseAIJson<CoachResult>(response.content);
      if (!parsed) throw new Error('The coaching response was not readable.');
      setCoachResult(parsed);
      setCoachTrainingIds(normalizeTrainingIds(parsed.training_ids, visibleResources));
    } catch {
      setCoachError('Coaching needs a connected OpenAI or Claude key. The training finder still works without spending app credits.');
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">Support Bot</Badge>
            <div>
              <CardTitle>Find the next useful thing.</CardTitle>
              <CardDescription>
                Search the ready trainings for free, or use your own AI key for plan-aware coaching.
              </CardDescription>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            <Button
              type="button"
              variant={mode === 'find' ? 'default' : 'outline'}
              className="min-h-9 whitespace-normal text-left leading-tight"
              onClick={() => setMode('find')}
            >
              <Search className="mr-2 h-4 w-4" />
              Find training
            </Button>
            <Button
              type="button"
              variant={mode === 'coach' ? 'default' : 'outline'}
              className="min-h-9 whitespace-normal text-left leading-tight"
              onClick={() => setMode('coach')}
            >
              <Bot className="mr-2 h-4 w-4" />
              Coach me
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="mastermind-support-question" className="text-sm font-medium">
            What are you trying to do right now?
          </label>
          <Textarea
            id="mastermind-support-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: I need help choosing what to sell this quarter."
            className="min-h-24"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={() => setMode('find')} variant={mode === 'find' ? 'default' : 'outline'}>
            <Search className="mr-2 h-4 w-4" />
            Find training
          </Button>
          <Button type="button" onClick={runCoach} disabled={mastermindAI.isPending}>
            {mastermindAI.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {mastermindAI.isPending ? 'Coaching...' : 'Coach me'}
          </Button>
          <Button type="button" variant="ghost" onClick={onOpenAiSettings}>
            Open AI key settings
          </Button>
        </div>

        {mode === 'coach' && coachResult && (
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Suggested for you</p>
                  <p className="text-sm text-muted-foreground">{coachResult.answer}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <BotNote label="One next move" value={coachResult.next_move} />
                  <BotNote label="Low-capacity version" value={coachResult.low_capacity_version} />
                  <BotNote label="Evidence to record" value={coachResult.evidence_to_record} />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'coach' && coachError && (
          <div className="rounded-lg border border-dashed bg-muted p-4 text-sm text-muted-foreground">
            <p>{coachError}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Recommended training</p>
              <p className="text-sm text-muted-foreground">Only ready, playable curriculum videos appear here.</p>
            </div>
            <Badge variant="outline" className="w-fit">{selectedStage.label} focus</Badge>
          </div>

          {displayedRecommendations.map((resource) => {
            const watched = completedResourceIds.has(resource.id);
            return (
              <div key={resource.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug">{resource.title}</p>
                    {watched && (
                      <Badge variant="secondary" className="w-fit">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Watched
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                </div>
                <Button type="button" variant={watched ? 'outline' : 'default'} onClick={() => onOpenResource(resource)}>
                  {watched ? 'Watch again' : resource.primaryAction}
                </Button>
              </div>
            );
          })}

          {displayedRecommendations.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted p-4 text-sm text-muted-foreground">
              No ready trainings match yet. Try a simpler search like offer, content, sales, or mindset.
            </div>
          )}
        </div>

        <p className={cn('text-xs text-muted-foreground', mode === 'find' && 'max-w-3xl')}>
          This does not change your plan. You are the boss. Change anything that does not fit.
        </p>
      </CardContent>
    </Card>
  );
}

function BotNote({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
