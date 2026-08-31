import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PlayCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { VaultPlayer } from '@/components/replay-vault/VaultPlayer';
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

export default function MastermindTraining() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackRequest = useRef({ generation: 0, controller: null as AbortController | null });
  const recoverySnapshotRef = useRef({ time: 0, shouldResume: false });
  const recoveryAttemptsRef = useRef(0);
  const lastProgressSaveRef = useRef(0);
  const resourceId = searchParams.get('resource') ?? '';
  const momentId = searchParams.get('moment');
  const questionId = searchParams.get('question');
  const fromPhaseOne = searchParams.get('from') === 'phase-one';
  const backHref = fromPhaseOne ? '/admin/mastermind-phase-one-preview' : '/mastermind';
  const backLabel = fromPhaseOne ? 'Back to Phase One' : 'Back to 90-Day Plan';
  const [progressSaved, setProgressSaved] = useState(false);

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
      const { data, error } = await supabase.functions.invoke('get-mastermind-playback-link', {
        body: {
          resourceId: nextTarget.resourceId,
          questionId: nextTarget.questionId,
          momentId: nextTarget.momentId,
          responseShape: 'verified_cue_v1',
          surface: 'curriculum',
          preview: true,
        },
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
    } catch {
      if (!controller.signal.aborted && playbackRequest.current.generation === generation) {
        if (options.recovery) setRecoveryFailed(true);
        else setPlaybackError('This training is temporarily unavailable. Your access has not changed.');
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
    if (saved && completed) setProgressSaved(true);
  }, [resourceId]);

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
              <Button type="button" onClick={() => navigate('/mastermind')}>Open 90-Day Plan</Button>
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
              <Button type="button" onClick={() => navigate('/mastermind')}>Back to 90-Day Plan</Button>
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
            showVaultTools={false}
            footer={(
              <div className="rounded-md border bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="text-sm font-semibold">After watching</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Go back to your plan and record the action or evidence this lesson helps you create.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => void persistProgress(true)}>
                    {progressSaved ? 'Marked complete' : 'Mark lesson complete'}
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate(backHref)}>
                    {backLabel}
                  </Button>
                </div>
              </div>
            )}

          />
        )}

        {playback && target?.startSeconds !== null && (
          <p className="text-sm text-muted-foreground">Started at {formatCompactTime(target.startSeconds)}.</p>
        )}
      </section>
    </Layout>
  );
}
