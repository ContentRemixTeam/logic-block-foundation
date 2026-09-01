import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, ClipboardCheck, Copy, Loader2, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { formatCompactTime } from '@/components/replay-vault/replayVaultCore.mjs';
import { formatMemberFacingResourceJob, type MastermindPortalResource } from '@/data/mastermindPortalResources';
import {
  usePhaseOneCurriculumMomentSearch,
  type PhaseOneCurriculumMomentRow,
} from '@/hooks/usePhaseOneCatalog';
import { parseAIJson, useMastermindAI } from '@/hooks/useMastermindAI';
import {
  MASTERMIND_SUCCESS_STAGES,
  type MastermindMilestone,
  type MastermindPlanCycle,
  type MastermindStageId,
} from '@/lib/mastermindSuccessPath';
import { searchMastermindPortalResources } from '@/lib/mastermindPortalSearch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SupportBotMode = 'coach' | 'find';

interface MastermindSupportBotProps {
  cycle?: MastermindPlanCycle | null;
  selectedStageId: MastermindStageId;
  currentMilestone: MastermindMilestone;
  visibleResources: MastermindPortalResource[];
  completedResourceIds: Set<string>;
  onOpenResource: (resource: MastermindPortalResource) => void;
  enableCurriculumMomentSearch?: boolean;
  curriculumMomentSearchPreview?: boolean;
  onOpenMoment?: (moment: PhaseOneCurriculumMomentRow) => void;
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
    member_job: formatMemberFacingResourceJob(resource.memberJob),
    stages: resource.stages,
  };
}

function normalizeTrainingIds(ids: string[] | undefined, resources: MastermindPortalResource[]) {
  const knownIds = new Set(resources.map((resource) => resource.id));
  return (ids ?? []).filter((id) => knownIds.has(id)).slice(0, 3);
}

function formatPromptResource(resource: MastermindPortalResource, index: number) {
  return [
    `${index + 1}. ${resource.title}`,
    `   Best for: ${formatMemberFacingResourceJob(resource.memberJob)}`,
    `   Why it matches: ${resource.description}`,
    `   After using it: ${resource.sourceStatus}`,
  ].join('\n');
}

function buildSupportPrompt({
  mode,
  question,
  cycle,
  selectedStage,
  currentMilestone,
  recommendedResources,
  completedResourceIds,
}: {
  mode: SupportBotMode;
  question: string;
  cycle?: MastermindPlanCycle | null;
  selectedStage: (typeof MASTERMIND_SUCCESS_STAGES)[number];
  currentMilestone: MastermindMilestone;
  recommendedResources: MastermindPortalResource[];
  completedResourceIds: Set<string>;
}) {
  const watchedTitles = recommendedResources
    .filter((resource) => completedResourceIds.has(resource.id))
    .map((resource) => resource.title);
  const availableResources = recommendedResources
    .filter((resource) => !completedResourceIds.has(resource.id))
    .slice(0, 3);
  const promptJob = mode === 'coach'
    ? 'Help me decide the smallest useful next move.'
    : 'Help me choose the best training to use first.';

  return [
    promptJob,
    '',
    'Use Faith Mariah-style Mastermind rules:',
    '- Give me one next move, not a new strategy maze.',
    '- Keep action before consumption.',
    '- Use evidence before interpretation.',
    '- Include a low-capacity version.',
    '- Tell me what to bring back as proof.',
    '- Do not shame me or tell me to restart unless the evidence truly says to adjust.',
    '',
    'My question:',
    question.trim() || DEFAULT_QUESTION,
    '',
    'My current 90-day plan:',
    `Goal: ${cycle?.goal || 'Not saved yet'}`,
    `Focus area: ${cycle?.focus_area || selectedStage.label}`,
    `Biggest bottleneck: ${cycle?.biggest_bottleneck || selectedStage.useWhen}`,
    `Audience: ${cycle?.audience_target || 'Not specified'}`,
    `Low-energy version: ${cycle?.low_energy_version || selectedStage.quickWin.lowEnergy}`,
    '',
    'Current Mastermind section:',
    `${selectedStage.label}: ${selectedStage.useWhen}`,
    `Checkpoint: ${currentMilestone.label}`,
    `Checkpoint output: ${currentMilestone.output}`,
    `Recommended move: ${selectedStage.doThis}`,
    `Evidence target: ${selectedStage.quickWin.evidence}`,
    '',
    'Training I can use:',
    availableResources.length > 0 ? availableResources.map(formatPromptResource).join('\n') : 'No unwatched ready training is recommended right now.',
    '',
    watchedTitles.length > 0 ? `Already watched or completed: ${watchedTitles.join(', ')}` : 'Already watched or completed: none from this recommendation set.',
    '',
    mode === 'coach'
      ? 'Please answer in this exact format: What I see, Do this next, Low-capacity version, Evidence to bring back, Use this training only if it helps, Ask Faith if.'
      : 'Please answer in this exact format: Start here, Why this one, Timestamp/question to look for, What to do after watching, What evidence to bring back.',
  ].join('\n');
}

export function MastermindSupportBot({
  cycle,
  selectedStageId,
  currentMilestone,
  visibleResources,
  completedResourceIds,
  onOpenResource,
  enableCurriculumMomentSearch = false,
  curriculumMomentSearchPreview = false,
  onOpenMoment,
  onOpenAiSettings,
}: MastermindSupportBotProps) {
  const [mode, setMode] = useState<SupportBotMode>('find');
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [coachTrainingIds, setCoachTrainingIds] = useState<string[]>([]);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<SupportBotMode | null>(null);
  const mastermindAI = useMastermindAI();
  const selectedStage = MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === selectedStageId) ?? MASTERMIND_SUCCESS_STAGES[0];
  const trimmedQuestion = question.trim();
  const hasMemberQuestion = trimmedQuestion.length >= 2 && trimmedQuestion !== DEFAULT_QUESTION;
  const searchableQuestion = trimmedQuestion || `${selectedStage.label} ${cycle?.goal ?? ''}`;
  const shouldSearchCurriculumMoments =
    Boolean(enableCurriculumMomentSearch && onOpenMoment && mode === 'find' && hasMemberQuestion);
  const supportMomentSearchQuery = usePhaseOneCurriculumMomentSearch(
    trimmedQuestion,
    selectedStageId,
    shouldSearchCurriculumMoments,
    curriculumMomentSearchPreview
  );

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

  const unwatchedFinderResults = useMemo(
    () => finderResults.filter((resource) => !completedResourceIds.has(resource.id)),
    [completedResourceIds, finderResults]
  );

  const coachTraining = useMemo(() => {
    const ids = normalizeTrainingIds(coachTrainingIds, visibleResources);
    if (ids.length === 0) return coachResult ? [] : unwatchedFinderResults;
    return ids
      .map((id) => visibleResources.find((resource) => resource.id === id))
      .filter((resource): resource is MastermindPortalResource => Boolean(resource))
      .filter((resource) => !completedResourceIds.has(resource.id));
  }, [coachResult, coachTrainingIds, completedResourceIds, unwatchedFinderResults, visibleResources]);

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

  const displayedRecommendations = mode === 'coach' ? coachTraining : unwatchedFinderResults;
  const supportMomentRows = useMemo(() => (
    [...(supportMomentSearchQuery.data ?? [])]
      .sort((a, b) => {
        const watchedA = a.completed || completedResourceIds.has(a.portal_resource_id) ? 1 : 0;
        const watchedB = b.completed || completedResourceIds.has(b.portal_resource_id) ? 1 : 0;
        return watchedA - watchedB;
      })
      .slice(0, 5)
  ), [completedResourceIds, supportMomentSearchQuery.data]);
  const emptyRecommendationCopy = mode === 'coach' && coachResult
    ? 'No new training is needed for this answer. Do the next move first, then bring back evidence for the next check-in.'
    : finderResults.length > 0 && unwatchedFinderResults.length === 0
      ? 'Everything ready for this focus is already watched. Bring your evidence to the next check-in, or open the Training Library if you want to rewatch.'
      : 'No ready trainings match yet. Try a simpler search like offer, content, sales, or mindset.';

  const fallbackTrainingIds = useMemo(
    () => finderResults.filter((resource) => !completedResourceIds.has(resource.id)).slice(0, 1).map((resource) => resource.id),
    [completedResourceIds, finderResults]
  );

  const deterministicCoachResult = useMemo<CoachResult>(() => ({
    answer: `Based on this 90-day plan, start with the ${selectedStage.label} constraint and keep the move evidence-producing.`,
    next_move: selectedStage.doThis,
    low_capacity_version: cycle?.low_energy_version?.trim() || selectedStage.quickWin.lowEnergy,
    evidence_to_record: selectedStage.quickWin.evidence,
    training_ids: fallbackTrainingIds,
  }), [cycle?.low_energy_version, fallbackTrainingIds, selectedStage]);

  const coachingPrompt = useMemo(() => buildSupportPrompt({
    mode: 'coach',
    question,
    cycle,
    selectedStage,
    currentMilestone,
    recommendedResources: finderResults,
    completedResourceIds,
  }), [completedResourceIds, currentMilestone, cycle, finderResults, question, selectedStage]);

  const finderPrompt = useMemo(() => buildSupportPrompt({
    mode: 'find',
    question,
    cycle,
    selectedStage,
    currentMilestone,
    recommendedResources: finderResults,
    completedResourceIds,
  }), [completedResourceIds, currentMilestone, cycle, finderResults, question, selectedStage]);

  const copyPrompt = async (promptMode: SupportBotMode) => {
    const prompt = promptMode === 'coach' ? coachingPrompt : finderPrompt;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(promptMode);
      toast.success(promptMode === 'coach' ? 'Coaching prompt copied.' : 'Finder prompt copied.');
      window.setTimeout(() => {
        setCopiedPrompt((current) => current === promptMode ? null : current);
      }, 2500);
    } catch {
      toast.error('Copy failed. Select the prompt text and copy it manually.');
    }
  };

  const runCoach = async () => {
    setMode('coach');
    setCoachError(null);
    setCoachResult(deterministicCoachResult);
    setCoachTrainingIds(normalizeTrainingIds(deterministicCoachResult.training_ids, visibleResources));

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
              'Do not change the user\'s plan. The user chooses what to use.',
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
      setCoachError('Live coaching needs your own OpenAI or Claude key. I added a no-key version below and a copyable prompt you can use in your own AI account.');
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
              <p className="mt-2 text-xs leading-snug text-muted-foreground">
                AI replies are generated by your connected AI account, not personally written by Faith.
              </p>
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

        <div className="rounded-lg border bg-muted/35 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Use your own AI without spending app credits</p>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Copy a plan-aware prompt into Claude or ChatGPT when you want deeper help before connecting an API key here.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-auto">
              <Button type="button" variant="outline" className="min-h-10 whitespace-normal" onClick={() => void copyPrompt('coach')}>
                {copiedPrompt === 'coach' ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy coaching prompt
              </Button>
              <Button type="button" variant="outline" className="min-h-10 whitespace-normal" onClick={() => void copyPrompt('find')}>
                {copiedPrompt === 'find' ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy finder prompt
              </Button>
            </div>
          </div>
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

        {mode === 'find' && enableCurriculumMomentSearch && onOpenMoment && (
          <div className="space-y-3 rounded-lg border bg-primary/5 p-4" data-support-bot-moment-search>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">Exact timestamp matches</p>
                  <Badge variant="outline" className="text-[11px]">Hidden QA</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ask about a phrase, problem, or decision and this searches approved curriculum transcripts for the most useful moments.
                </p>
              </div>
              {hasMemberQuestion && (
                <Badge variant="secondary" className="w-fit text-[11px]">
                  {supportMomentRows.length} match{supportMomentRows.length === 1 ? '' : 'es'}
                </Badge>
              )}
            </div>

            {!hasMemberQuestion && (
              <p className="text-sm text-muted-foreground">
                Type what you are looking for, like pricing, offer, sales, list, onboarding, or systems.
              </p>
            )}

            {supportMomentSearchQuery.isFetching && (
              <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                Searching transcript moments...
              </p>
            )}

            {supportMomentSearchQuery.isError && (
              <p role="alert" className="text-sm text-muted-foreground">
                Timestamp search is not available in this build yet. The video recommendations below still work.
              </p>
            )}

            {hasMemberQuestion && !supportMomentSearchQuery.isFetching && !supportMomentSearchQuery.isError && supportMomentRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No exact timestamp matches yet. Try a simpler phrase from Faith's trainings.
              </p>
            )}

            {supportMomentRows.length > 0 && (
              <div className="space-y-2">
                {supportMomentRows.map((moment) => {
                  const watched = moment.completed || completedResourceIds.has(moment.portal_resource_id);
                  return (
                    <div
                      key={`${moment.portal_resource_id}-${moment.moment_id}`}
                      className="flex flex-col gap-3 rounded-md border bg-background p-3 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-[11px]">
                            {formatCompactTime(moment.start_seconds ?? 0)}
                          </Badge>
                          {watched && (
                            <Badge variant="success" className="text-[11px]">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Watched
                            </Badge>
                          )}
                          <p className="break-words text-sm font-semibold">{moment.title ?? 'Mastermind training'}</p>
                        </div>
                        <p className="break-words text-sm leading-relaxed text-muted-foreground">
                          {moment.snippet || 'Transcript moment matched this search.'}
                        </p>
                      </div>
                      <Button type="button" variant="secondary" className="min-h-10 shrink-0" onClick={() => onOpenMoment(moment)}>
                        Open this moment
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
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
              {emptyRecommendationCopy}
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
