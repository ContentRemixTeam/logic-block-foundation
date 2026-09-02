import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, ListTodo, Loader2, MessageCircle, PlayCircle, Search, Sparkles, Target, Users, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useResilientTaskMutation } from '@/hooks/useResilientTaskMutation';
import { cn } from '@/lib/utils';
import {
  getMastermindWeeklyGuidance,
  type MastermindPlanCycle,
  type MastermindResourceRecommendation,
  type MastermindStageId,
  type MastermindSuccessPathOutput,
} from '@/lib/mastermindSuccessPath';
import {
  CREATOR_CAMP_PLATFORM_MATCHES,
  getMastermindPhaseRound,
  type MastermindRoundMode,
} from '@/data/mastermindPhaseRounds';
import { COMMUNITY_URLS } from '@/constants/community';

interface SuccessPathPlanCardProps {
  cycle: MastermindPlanCycle | null | undefined;
  successPath: MastermindSuccessPathOutput | null | undefined;
  selectedStageId: MastermindStageId;
  currentMilestoneId?: string | null;
  isLoading: boolean;
  onBuildPlan: () => void;
  onOpenResource: (resource: MastermindResourceRecommendation) => void;
  onAddToPlan: () => void;
  onAskFaith: () => void;
  onFindSupport: () => void;
  onChangeFocus?: () => void;
}

const PLACEHOLDER_GOALS = new Set(['my 90-day goal', 'my 90 day goal', 'n']);
const WEEKLY_MOVE_TASK_STORAGE_KEY = 'mastermind-weekly-move-task-keys';
type WeeklyMoveTaskState = 'idle' | 'saving' | 'saved' | 'queued' | 'failed';

const roundModeButtonClass =
  'border-[#C8145E] text-[#C8145E] hover:bg-[#FFF0F5] hover:text-[#C8145E] data-[selected=true]:border-[#111111] data-[selected=true]:bg-[#111111] data-[selected=true]:text-white data-[selected=true]:hover:bg-[#C8145E] data-[selected=true]:hover:text-white';

function getRealGoal(goal: string | null | undefined) {
  const normalized = goal?.trim().toLowerCase();
  if (!normalized || PLACEHOLDER_GOALS.has(normalized)) return null;
  return goal?.trim() ?? null;
}

function getSavedWeeklyMoveTaskKeys() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WEEKLY_MOVE_TASK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

function hasSavedWeeklyMoveTaskKey(key: string) {
  return getSavedWeeklyMoveTaskKeys().includes(key);
}

function rememberWeeklyMoveTaskKey(key: string) {
  if (typeof window === 'undefined') return;
  const nextKeys = [key, ...getSavedWeeklyMoveTaskKeys().filter((savedKey) => savedKey !== key)].slice(0, 80);
  try {
    window.localStorage.setItem(WEEKLY_MOVE_TASK_STORAGE_KEY, JSON.stringify(nextKeys));
  } catch {
    // The Planner task has already been saved or queued; this memory is only duplicate prevention.
  }
}

export function SuccessPathPlanCard({
  cycle,
  successPath,
  selectedStageId,
  currentMilestoneId,
  isLoading,
  onBuildPlan,
  onOpenResource,
  onAddToPlan,
  onAskFaith,
  onFindSupport,
  onChangeFocus,
}: SuccessPathPlanCardProps) {
  const [roundMode, setRoundMode] = useState<MastermindRoundMode>('build');
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [weeklyMoveTaskStates, setWeeklyMoveTaskStates] = useState<Record<string, WeeklyMoveTaskState>>({});
  const { resilientCreate } = useResilientTaskMutation();
  const roundForTaskKey = getMastermindPhaseRound(selectedStageId, currentMilestoneId);
  const weeklyMoveTaskKey = cycle
    ? [cycle.cycle_id, selectedStageId, currentMilestoneId ?? 'stage', roundMode, roundForTaskKey.primaryResourceId].join(':')
    : null;

  useEffect(() => {
    if (!weeklyMoveTaskKey || !hasSavedWeeklyMoveTaskKey(weeklyMoveTaskKey)) return;
    setWeeklyMoveTaskStates((states) => ({ ...states, [weeklyMoveTaskKey]: 'saved' }));
  }, [weeklyMoveTaskKey]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Sparkles className="mr-2 inline h-4 w-4 animate-pulse" aria-hidden="true" />
          Reading your 90-day plan...
        </CardContent>
      </Card>
    );
  }

  if (!cycle) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-4 p-6">
          <Badge variant="secondary" className="text-[11px]">Start here</Badge>
          <div>
            <h2 className="text-2xl font-bold leading-tight">Build your 90-day plan.</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Answer the planning questions first. Then this page will turn the plan into one weekly move, one evidence target, and the most useful training to watch next.
            </p>
          </div>
          <Button type="button" onClick={onBuildPlan}>
            Build 90-Day Plan
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const guidance = getMastermindWeeklyGuidance(selectedStageId, cycle, currentMilestoneId);
  const { stage, quickWin } = guidance;
  const round = roundForTaskKey;
  const registeredResource = stage.resources.find((resource) => resource.resourceId === round.primaryResourceId);
  const primaryResource: MastermindResourceRecommendation = registeredResource ?? {
    resourceId: round.primaryResourceId,
    title: round.primaryResourceTitle,
    access: 'Core',
    useWhen: `Use this only if it helps you complete ${stage.label.toLowerCase()} round: ${round.question}`,
    afterWatching: roundMode === 'build' ? round.buildAction : round.improveAction,
  };
  const isAiSetupResource = primaryResource.resourceId === 'faith-ai';
  const PrimaryResourceIcon = isAiSetupResource ? Sparkles : PlayCircle;
  const primaryResourceLabel = isAiSetupResource ? 'Set up if needed' : 'Watch if needed';
  const primaryResourceActionLabel = isAiSetupResource ? 'Open AI settings' : 'Open training';
  const primaryResourceAfterLabel = isAiSetupResource ? 'After setup: ' : 'After watching: ';
  const selectedPlatform = CREATOR_CAMP_PLATFORM_MATCHES.find((item) => item.id === platformId) ?? null;
  const realGoal = getRealGoal(cycle.goal);
  const currentAction = roundMode === 'build' ? round.buildAction : round.improveAction;
  const weeklyMoveTaskState = weeklyMoveTaskStates[weeklyMoveTaskKey] ?? 'idle';
  const openCommunity = () => {
    window.open(COMMUNITY_URLS.COMMUNITY_HOME, '_blank', 'noopener,noreferrer');
  };
  const setCurrentWeeklyMoveTaskState = (state: WeeklyMoveTaskState) => {
    setWeeklyMoveTaskStates((states) => ({ ...states, [weeklyMoveTaskKey]: state }));
  };
  const addWeeklyMoveToPlanner = async () => {
    if (hasSavedWeeklyMoveTaskKey(weeklyMoveTaskKey)) {
      setCurrentWeeklyMoveTaskState('saved');
      return;
    }

    setCurrentWeeklyMoveTaskState('saving');

    try {
      const result = await resilientCreate({
        task_text: `${stage.label}: ${currentAction}`.slice(0, 500),
        task_description: [
          `90-day plan: ${realGoal ?? stage.milestone}`,
          `Current focus: ${stage.label}`,
          `Checkpoint: ${round.question}`,
          `Evidence to bring back: ${round.evidence}`,
          `Done enough: ${round.doneEnough}`,
          `Low-capacity version: ${cycle?.low_energy_version?.trim() || round.lowCapacity}`,
          `Suggested training: ${round.primaryResourceTitle}`,
        ].join('\n\n'),
        cycle_id: cycle.cycle_id,
        status: 'backlog',
        priority: 'high',
        energy_level: 'medium',
        estimated_minutes: 60,
        context_tags: ['mastermind', '90-day-plan', stage.id, roundMode],
        momentum_type: stage.id === 'find' || stage.id === 'nurture' ? 'audience'
          : stage.id === 'deliver' ? 'delivery'
            : stage.id === 'leverage' ? 'operations'
              : 'revenue',
        done_enough_definition: round.doneEnough,
        system_source: 'mastermind-90-day-plan',
        is_system_generated: true,
        task_type: 'weekly_move',
        template_key: `mastermind:${stage.id}:${currentMilestoneId ?? 'stage'}:${roundMode}`,
      });

      const nextState = result.queued ? 'queued' : 'saved';
      rememberWeeklyMoveTaskKey(weeklyMoveTaskKey);
      setCurrentWeeklyMoveTaskState(nextState);
    } catch {
      setCurrentWeeklyMoveTaskState('failed');
    }
  };

  return (
    <Card className="overflow-hidden border-[#111111] bg-white">
      <CardContent className="p-0">
        <div className="space-y-4 p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">Your 90-day plan</Badge>
              <Badge variant="outline" className="text-[11px]">Current focus: {stage.label}</Badge>
              <Badge variant="outline" className="text-[11px]">{roundMode === 'build' ? 'Build round' : 'Improve round'}</Badge>
            </div>
            {onChangeFocus && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit border-primary text-primary hover:bg-primary/10 hover:text-primary"
                onClick={onChangeFocus}
              >
                <Target className="mr-2 h-4 w-4" aria-hidden="true" />
                Choose/change focus
              </Button>
            )}
          </div>

          <div className="border-l-[3px] border-[#C8145E] bg-[#FFF0F5] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
              <ListTodo className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>After the planning wizard</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[#555555]">
              Plan saved, focus chosen, one weekly move, one useful training, evidence for check-in. Your plan setup chose {stage.label} as the current bottleneck.
            </p>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold leading-tight md:text-3xl">
              {realGoal ?? stage.milestone}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This week is about the part that is most likely slowing the 90-day result down.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="border bg-[#F7F5F2] p-4">
              <p className="text-xs font-semibold text-muted-foreground">Why this is first</p>
              <p className="mt-1 text-sm leading-relaxed">
                {successPath?.stageId === selectedStageId
                  ? successPath.reason
                  : `This is the focus saved from your planning setup. If the evidence says another bottleneck matters more, choose a different focus; otherwise keep this round simple and keep moving.`}
              </p>
            </div>
            <div className="border bg-background p-4">
              <p className="text-sm font-semibold">Build or improve?</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose the version of the move that fits this round.</p>
              <div className="mt-3 grid gap-2">
              <Button
                type="button"
                variant="outline"
                data-selected={roundMode === 'build'}
                className={cn(roundModeButtonClass)}
                onClick={() => setRoundMode('build')}
              >
                Build it for the first time
              </Button>
              <Button
                type="button"
                variant="outline"
                data-selected={roundMode === 'improve'}
                className={cn(roundModeButtonClass)}
                onClick={() => setRoundMode('improve')}
              >
                Improve what already works
              </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border border-[#C8145E] bg-[#FFF0F5] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold">Do this this week</p>
              </div>
              <h3 className="text-lg font-semibold leading-snug">{round.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {roundMode === 'build' ? round.buildAction : round.improveAction}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="bg-white p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Time box</p>
                  <p className="mt-1 text-sm">{quickWin.timeBox}</p>
                </div>
                <div className="bg-white p-3">
                  <p className="text-xs font-semibold text-muted-foreground">If capacity is low</p>
                  <p className="mt-1 text-sm leading-snug">{cycle?.low_energy_version?.trim() || round.lowCapacity}</p>
                </div>
              </div>
              <div className="mt-3 bg-white p-3">
                <p className="text-xs font-semibold text-muted-foreground">If you get stuck</p>
                <p className="mt-1 text-sm leading-snug">{round.rescue}</p>
              </div>
            </div>

            <div className="border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold">Evidence to bring back<span className="sr-only"> Bring back this evidence</span></p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{round.evidence}</p>
              <p className="mt-3 text-xs leading-snug text-muted-foreground">
                After you try it, post one takeaway, question, or win in the Community so the room can help you keep moving.
              </p>
              <p className="mt-3 text-sm"><span className="font-semibold">Done when: </span>{round.doneEnough}</p>
              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => void addWeeklyMoveToPlanner()}
                  disabled={weeklyMoveTaskState === 'saving' || weeklyMoveTaskState === 'saved' || weeklyMoveTaskState === 'queued'}
                >
                  {weeklyMoveTaskState === 'saving' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : weeklyMoveTaskState === 'saved' || weeklyMoveTaskState === 'queued' ? (
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ListTodo className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {weeklyMoveTaskState === 'saving'
                    ? 'Adding to Planner...'
                    : weeklyMoveTaskState === 'queued'
                      ? 'Saved for sync'
                      : weeklyMoveTaskState === 'saved'
                        ? 'Added to Planner'
                        : weeklyMoveTaskState === 'failed'
                          ? 'Try adding again'
                          : 'Add this weekly move'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={onAddToPlan}>
                  Review 90-Day Plan
                </Button>
              </div>
              <p className="mt-2 text-xs leading-snug text-muted-foreground" role="status" aria-live="polite">
                {weeklyMoveTaskState === 'queued'
                  ? 'Saved locally and will sync when the Planner can reconnect.'
                  : weeklyMoveTaskState === 'saved'
                    ? 'This move is now in your Planner tasks.'
                    : weeklyMoveTaskState === 'failed'
                      ? 'The plan is still safe. Try again or review the plan manually.'
                      : 'This creates one task tied to this 90-day cycle.'}
              </p>
            </div>
          </div>

          {selectedStageId === 'find' && currentMilestoneId === 'find-create' && (
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Optional platform workshop</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose the platform already in your plan. These guest workshops appear only after access and transcript checks pass.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CREATOR_CAMP_PLATFORM_MATCHES.map((platform) => (
                  <Button key={platform.id} type="button" size="sm" variant={platformId === platform.id ? 'secondary' : 'outline'} onClick={() => setPlatformId(platform.id)}>
                    {platform.label}
                  </Button>
                ))}
              </div>
              {selectedPlatform && (
                <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                  <p className="font-semibold">{selectedPlatform.label} support</p>
                  <p className="text-muted-foreground">A platform-specific workshop can be added here after transcript, attribution, and access checks pass.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedPlatform.status === 'ready_for_entitlement_review'
                      ? 'Transcript matched. Access verification is still required before this opens.'
                      : 'Transcript and access verification are still required before this can open.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {primaryResource && (
            <div className="border bg-background p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <PrimaryResourceIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold">{primaryResourceLabel}</p>
                    <Badge variant="outline" className="text-[11px]">{primaryResource.access}</Badge>
                    {!isAiSetupResource && <Badge variant="outline" className="text-[11px]">ready to watch</Badge>}
                  </div>
                  <h3 className="break-words text-base font-semibold leading-snug">{round.primaryResourceTitle}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{primaryResource.useWhen}</p>
                  {primaryResource.afterWatching && (
                    <p className="mt-2 text-sm leading-relaxed">
                      <span className="font-semibold">{primaryResourceAfterLabel}</span>{primaryResource.afterWatching}
                    </p>
                  )}
                </div>
                <Button type="button" variant="outline" className="w-full shrink-0 lg:w-auto" onClick={() => onOpenResource(primaryResource)}>
                  {primaryResourceActionLabel}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-[#111111] pt-4 sm:flex-row sm:flex-wrap">
            <Button type="button" onClick={onFindSupport}>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Find training
            </Button>
            <Button type="button" variant="outline" onClick={onAskFaith}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Ask Faith
            </Button>
            <Button type="button" variant="outline" onClick={openCommunity}>
              <Users className="mr-2 h-4 w-4" aria-hidden="true" />
              Post in Community
              <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="border-t bg-[#F7F5F2] px-4 py-4 sm:px-5 md:px-6">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm">
              <span className="font-semibold">You'll know this is working when: </span>
              {round.doneEnough} When this round is complete, choose the next constraint or run another improvement round.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
