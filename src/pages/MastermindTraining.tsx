import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, PlayCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { VaultPlayer } from '@/components/replay-vault/VaultPlayer';
import { MastermindCurriculumTranscript } from '@/components/mastermind/MastermindCurriculumTranscript';
import {
  MASTERMIND_PORTAL_RESOURCES,
  type MastermindPortalResource,
} from '@/data/mastermindPortalResources';
import {
  MASTERMIND_SUCCESS_STAGES,
  type MastermindResourceRecommendation,
  type MastermindStageId,
} from '@/lib/mastermindSuccessPath';
import {
  formatCompactTime,
  isStableVaultId,
  shouldAutoRefresh,
  validatePlaybackResponse,
} from '@/components/replay-vault/replayVaultCore.mjs';
import type { PlaybackResult, PlaybackTarget } from '@/components/replay-vault/types';
import { useVaultSeekCoordinator } from '@/components/replay-vault/useVaultSeekCoordinator';
import { savePhaseOneVideoProgress, usePhaseOneCatalog } from '@/hooks/usePhaseOneCatalog';

const targetKey = (target: PlaybackTarget) => `${target.resourceId}:${target.momentId ?? target.questionId ?? 'lesson'}`;
const STAGE_IDS = new Set<MastermindStageId>(MASTERMIND_SUCCESS_STAGES.map((stage) => stage.id));
const PLAYBACK_REQUEST_TIMEOUT_MS = 30_000;

function isMastermindStageId(value: string | null): value is MastermindStageId {
  return Boolean(value && STAGE_IDS.has(value as MastermindStageId));
}

function findLessonRecommendation(resourceId: string, stageId: MastermindStageId | null): MastermindResourceRecommendation | null {
  const stageOrderedRecommendations = MASTERMIND_SUCCESS_STAGES.flatMap((stage) => stage.resources);
  if (stageId) {
    const stage = MASTERMIND_SUCCESS_STAGES.find((item) => item.id === stageId);
    const recommendation = stage?.resources.find((item) => item.resourceId === resourceId);
    if (recommendation) return recommendation;
  }
  return stageOrderedRecommendations.find((item) => item.resourceId === resourceId) ?? null;
}

function getLessonStage(resource: MastermindPortalResource | null, requestedStageId: MastermindStageId | null) {
  const fallbackStageId = resource?.stages[0] ?? null;
  const stageId = requestedStageId && resource?.stages.includes(requestedStageId)
    ? requestedStageId
    : fallbackStageId;
  return MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === stageId) ?? null;
}

export default function MastermindTraining() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackRequest = useRef({ generation: 0, controller: null as AbortController | null });
  const recoverySnapshotRef = useRef({ time: 0, shouldResume: false });
  const recoveryAttemptsRef = useRef(0);
  const lastProgressSaveRef = useRef(0);
  const resourceId = searchParams.get('resource') ?? '';
  const stageParam = searchParams.get('stage');
  const requestedStageId = isMastermindStageId(stageParam) ? stageParam : null;
  const momentId = searchParams.get('moment');
  const questionId = searchParams.get('question');
  const fromPhaseOne = searchParams.get('from') === 'phase-one';
  const isAdminTrainingPreview = location.pathname.startsWith('/admin/mastermind-training-preview');
  const backHref = fromPhaseOne
    ? '/admin/mastermind-90-day-plan-preview'
    : isAdminTrainingPreview
      ? '/admin/mastermind-90-day-plan-preview'
      : '/mastermind';
  const backLabel = 'Back to 90-Day Plan';
  const [progressSaved, setProgressSaved] = useState(false);
  // Completion is server-owned: hydrate the checkoff from the authorized
  // Phase One catalog so a reload keeps the saved completed state.
  const queryClient = useQueryClient();
  const catalogQuery = usePhaseOneCatalog(isStableVaultId(resourceId));
  const catalogRows = catalogQuery.data;
  const resourceMetadata = useMemo(
    () => MASTERMIND_PORTAL_RESOURCES.find((resource) => resource.id === resourceId) ?? null,
    [resourceId],
  );
  const lessonStage = useMemo(
    () => getLessonStage(resourceMetadata, requestedStageId),
    [requestedStageId, resourceMetadata],
  );
  const lessonRecommendation = useMemo(
    () => findLessonRecommendation(resourceId, lessonStage?.id ?? null),
    [lessonStage?.id, resourceId],
  );
  const lessonAfterWatching = lessonRecommendation?.afterWatching
    ?? resourceMetadata?.sourceStatus
    ?? 'Go back to your plan and record the action or evidence this lesson helps you create.';
  const lessonEvidence = lessonStage?.quickWin.evidence
    ?? 'Record what you tried, what happened, and what you will do next.';
  const lessonNextAction = lessonStage?.doThis ?? lessonAfterWatching;
  // Only "checking" while an authorized fetch is genuinely in flight.
  const catalogPending = catalogQuery.isFetching && catalogQuery.data === undefined;
  const serverCompleted = useMemo(
    () => (catalogRows ?? []).some((row) => row.portal_resource_id === resourceId && row.completed === true),
    [catalogRows, resourceId],
  );
  useEffect(() => { setProgressSaved(false); }, [resourceId]);
  useEffect(() => { if (serverCompleted) setProgressSaved(true); }, [serverCompleted]);


  const initialTarget = useMemo<PlaybackTarget | null>(() => {
    if (!isStableVaultId(resourceId)) return null;
    return {
      resourceId,
      title: 'Mastermind training',
      startSeconds: null,
      momentId: isStableVaultId(momentId) ? momentId : null,
      questionId: isStableVaultId(questionId) && !isStableVaultId(momentId) ? questionId : null,
    };
  }, [momentId, questionId, resourceId]);
  const [playback, setPlayback] = useState<PlaybackResult | null>(null);
  const [target, setTarget] = useState<PlaybackTarget | null>(initialTarget);
  const [loading, setLoading] = useState(false);
  const [sourceGeneration, setSourceGeneration] = useState(0);
  const [activationNonce, setActivationNonce] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const { announcement, onLoadedMetadata, resetForSource } = useVaultSeekCoordinator({
    mediaRef: videoRef,
    targetSeconds: target?.startSeconds ?? null,
    targetKey: target ? targetKey(target) : null,
    activationNonce,
  });

  useEffect(() => () => { playbackRequest.current.controller?.abort(); }, []);
  useEffect(() => { setTarget(initialTarget); }, [initialTarget]);
  useEffect(() => { setCurrentTime(0); }, [resourceId]);

  const resolvePlayback = useCallback(async (nextTarget: PlaybackTarget, options: { recovery?: boolean } = {}) => {
    playbackRequest.current.controller?.abort();
    const controller = new AbortController();
    const generation = playbackRequest.current.generation + 1;
    playbackRequest.current = { generation, controller };
    if (options.recovery) setRecoveryBusy(true);
    else {
      setLoading(true);
      setPlayback(null);
      setPlaybackError(null);
      setRecoveryFailed(false);
    }

    try {
      let timeoutId: ReturnType<typeof window.setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('playback_request_timeout')), PLAYBACK_REQUEST_TIMEOUT_MS);
      });
      const playbackRequestPromise = supabase.functions.invoke('get-mastermind-playback-link', {
        body: {
          resourceId: nextTarget.resourceId,
          questionId: nextTarget.questionId,
          momentId: nextTarget.momentId,
          responseShape: 'verified_cue_v1',
          surface: 'curriculum',
          preview: isAdminTrainingPreview,
        },
      });
      const { data, error } = await Promise.race([playbackRequestPromise, timeout]).finally(() => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
      if (controller.signal.aborted || playbackRequest.current.generation !== generation) return false;
      const result = error ? null : validatePlaybackResponse(data, nextTarget);
      if (!result) {
        if (options.recovery) setRecoveryFailed(true);
        else setPlaybackError('This training is not available in the app yet.');
        return false;
      }
      resetForSource();
      setSourceGeneration((value) => value + 1);
      setPlayback(result);
      setTarget({ ...nextTarget, title: result.title, startSeconds: options.recovery ? recoverySnapshotRef.current.time : result.startSeconds });
      setActivationNonce((value) => value + 1);
      setRecoveryFailed(false);
      return true;
    } catch (error) {
      if (!controller.signal.aborted && playbackRequest.current.generation === generation) {
        if (options.recovery) setRecoveryFailed(true);
        else {
          setPlaybackError(
            error instanceof Error && error.message === 'playback_request_timeout'
              ? 'This training is taking longer than expected to open. Your access has not changed.'
              : 'This training is temporarily unavailable. Your access has not changed.',
          );
        }
      }
      return false;
    } finally {
      if (!controller.signal.aborted && playbackRequest.current.generation === generation) {
        setLoading(false);
        setRecoveryBusy(false);
      }
    }
  }, [resetForSource]);

  useEffect(() => {
    if (!initialTarget) return;
    recoveryAttemptsRef.current = 0;
    void resolvePlayback(initialTarget);
  }, [initialTarget, resolvePlayback]);

  const refreshPlayback = useCallback(async (manual = false) => {
    if (!target || !playback || playback.provider === 'youtube' || recoveryBusy) return;
    const media = videoRef.current;
    recoverySnapshotRef.current = { time: media?.currentTime ?? target.startSeconds ?? 0, shouldResume: Boolean(media && !media.paused) };
    media?.pause();
    if (!manual) recoveryAttemptsRef.current += 1;
    await resolvePlayback(target, { recovery: true });
  }, [playback, recoveryBusy, resolvePlayback, target]);

  const handleLoadedMetadata = () => {
    onLoadedMetadata();
    const media = videoRef.current;
    if (media) {
      const requestedTime = recoverySnapshotRef.current.time || target?.startSeconds || 0;
      media.currentTime = Math.min(requestedTime, Number.isFinite(media.duration) ? Math.max(0, media.duration - 0.25) : Infinity);
    }
    if (media && recoverySnapshotRef.current.shouldResume) {
      recoverySnapshotRef.current.shouldResume = false;
      void media.play().catch(() => undefined);
    }
  };

  const handleMediaError = () => {
    if (!recoveryBusy && shouldAutoRefresh(recoveryAttemptsRef.current)) void refreshPlayback(false);
    else setRecoveryFailed(true);
  };

  // Member-owned progress is written only through the validated Phase One RPC.
  const persistProgress = useCallback(async (completed: boolean) => {
    if (!resourceId) return;
    const media = videoRef.current;
    const position = Math.floor(media?.currentTime ?? 0);
    const saved = await savePhaseOneVideoProgress({
      portalResourceId: resourceId,
      lastPositionSeconds: position,
      watchedSeconds: position,
      completed,
      completionSource: completed ? 'member_confirmed' : 'playback',
    });
    if (saved && completed) {
      setProgressSaved(true);
      void queryClient.invalidateQueries({ queryKey: ['phase-one-catalog'] });
    }
  }, [queryClient, resourceId]);


  useEffect(() => {
    const media = videoRef.current;
    if (!media || !playback) return;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastProgressSaveRef.current < 15_000) return;
      lastProgressSaveRef.current = now;
      void persistProgress(false);
    };
    const onEnded = () => { void persistProgress(true); };
    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('ended', onEnded);
    return () => {
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('ended', onEnded);
    };
  }, [playback, persistProgress]);


  useEffect(() => {
    if (!playback?.expiresAt || playback.provider === 'youtube') return;
    const refreshIn = new Date(playback.expiresAt).getTime() - Date.now() - 30_000;
    if (!Number.isFinite(refreshIn) || refreshIn <= 0) return;
    const timer = window.setTimeout(() => {
      if (shouldAutoRefresh(recoveryAttemptsRef.current)) void refreshPlayback(false);
    }, Math.min(refreshIn, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [playback?.expiresAt, playback?.provider, refreshPlayback]);

  const openTarget = (nextTarget: PlaybackTarget) => {
    recoveryAttemptsRef.current = 0;
    void resolvePlayback(nextTarget);
  };

  return (
    <Layout>
      <section className="mx-auto w-full max-w-5xl space-y-6 overflow-x-clip">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">Mastermind Training Library</Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Training</h1>
              <p className="max-w-2xl text-muted-foreground">
                Watch the lesson connected to your current 90-day plan.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate(backHref)} className="w-full md:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Button>

        </div>

        {!initialTarget && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a training from your plan.</CardTitle>
              <CardDescription>This page opens lessons from the recommendation card once a video is ready in the protected library.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={() => navigate(backHref)}>Open 90-Day Plan</Button>
            </CardContent>
          </Card>
        )}

        {initialTarget && resourceMetadata && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="w-fit">Lesson context</Badge>
                {lessonStage && <Badge variant="outline" className="w-fit">{lessonStage.label}</Badge>}
              </div>
              <CardTitle>{resourceMetadata.title}</CardTitle>
              <CardDescription>{resourceMetadata.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">Use this when</p>
                <p className="mt-1 text-sm leading-relaxed">{lessonRecommendation?.useWhen ?? resourceMetadata.memberJob}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">Connected outcome</p>
                <p className="mt-1 text-sm leading-relaxed">{lessonStage?.milestone ?? 'Make the next 90-day move easier to complete.'}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">After watching</p>
                <p className="mt-1 text-sm leading-relaxed">{lessonAfterWatching}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground">Evidence to bring back</p>
                <p className="mt-1 text-sm leading-relaxed">{lessonEvidence}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {initialTarget && loading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Opening protected training...
            </CardContent>
          </Card>
        )}

        {playbackError && (
          <Card role="alert" className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Training is not ready here yet
              </CardTitle>
              <CardDescription>
                The lesson is mapped to the protected library, but the video still needs its approved media and transcript import before it can play in this app.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => navigate(backHref)}>Back to 90-Day Plan</Button>
              {initialTarget && (
                <Button type="button" variant="outline" onClick={() => void resolvePlayback(initialTarget)}>
                  Try again
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {playback && target && (
          <VaultPlayer
            playback={playback}
            target={target}
            videoRef={videoRef}
            announcement={announcement}
            sourceGeneration={sourceGeneration}
            recoveryBusy={recoveryBusy}
            recoveryFailed={recoveryFailed}
            onLoadedMetadata={handleLoadedMetadata}
            onMediaError={handleMediaError}
            onManualRefresh={() => void refreshPlayback(true)}
            onOpen={openTarget}
            onCurrentTimeChange={setCurrentTime}
            showVaultTools={false}
            footer={(
              <div className="rounded-md border bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="text-sm font-semibold">After watching</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {lessonAfterWatching}
                </p>
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="font-semibold">Bring back: </span>{lessonEvidence}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={catalogPending} onClick={() => void persistProgress(true)}>
                    {catalogPending ? 'Checking your progress…' : progressSaved ? 'Marked complete' : 'Mark lesson complete'}
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate(backHref)}>
                    {backLabel}
                  </Button>
                </div>
                {progressSaved && (
                  <div className="mt-3 rounded-md border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                      <p className="text-sm font-semibold">Next step in your planner</p>
                    </div>
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">Do this: </span>{lessonNextAction}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">Record evidence: </span>{lessonEvidence}
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => navigate(backHref)}>
                        Return to plan
                      </Button>
                      <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={() => navigate('/evidence')}>
                        Record evidence
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          />
        )}

        {playback && isAdminTrainingPreview && (
          <MastermindCurriculumTranscript
            resourceId={playback.resourceId}
            title={playback.title}
            currentTime={currentTime}
            onOpen={openTarget}
          />
        )}

        {playback && target?.startSeconds !== null && (
          <p className="text-sm text-muted-foreground">Started at {formatCompactTime(target.startSeconds)}.</p>
        )}
      </section>
    </Layout>
  );
}
