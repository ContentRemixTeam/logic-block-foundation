import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Library, Lock, Search, WifiOff } from 'lucide-react';
import { VaultPlayer } from '@/components/replay-vault/VaultPlayer';
import { VaultSearchResults } from '@/components/replay-vault/VaultSearchResults';
import { groupSearchResults, makeAuthReturnTo, normalizeAccessResponse, parseDetailTarget, shouldAutoRefresh, validatePlaybackResponse } from '@/components/replay-vault/replayVaultCore.mjs';
import type { PlaybackResult, PlaybackTarget, VaultAccessState, VaultReplayGroup } from '@/components/replay-vault/types';
import { useVaultSeekCoordinator } from '@/components/replay-vault/useVaultSeekCoordinator';

function canUseVault(access: VaultAccessState) { return access.status === 'allowed' || access.status === 'limited'; }
type DeepLinkState = { key: string | null; status: 'idle' | 'loading' | 'success' | 'error' };
const targetKey = (target: { resourceId: string; momentId?: string | null; questionId?: string | null }) => `${target.resourceId}:${target.momentId ?? target.questionId ?? 'replay'}`;

export default function ReplayVault() {
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const accessRequest = useRef({ generation: 0, controller: null as AbortController | null });
  const searchRequest = useRef({ generation: 0, controller: null as AbortController | null });
  const playbackRequest = useRef({ generation: 0, controller: null as AbortController | null });
  const recoverySnapshotRef = useRef({ time: 0, shouldResume: false });
  const recoveryAttemptsRef = useRef(0);
  const deepLinkAttemptedRef = useRef<string | null>(null);
  const deepLinkBusyRef = useRef(false);
  const [access, setAccess] = useState<VaultAccessState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [groups, setGroups] = useState<VaultReplayGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackResult | null>(null);
  const [target, setTarget] = useState<PlaybackTarget | null>(null);
  const [activationNonce, setActivationNonce] = useState(0);
  const [sourceGeneration, setSourceGeneration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<DeepLinkState>({ key: null, status: 'idle' });
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);

  const detailTarget = useMemo(() => parseDetailTarget(location.search), [location.search]);
  const detailKey = detailTarget ? targetKey(detailTarget) : null;
  const { announcement, onLoadedMetadata, resetForSource } = useVaultSeekCoordinator({ mediaRef: videoRef, targetSeconds: target?.startSeconds ?? null, targetKey: target ? targetKey(target) : null, activationNonce });

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => () => { accessRequest.current.controller?.abort(); searchRequest.current.controller?.abort(); playbackRequest.current.controller?.abort(); }, []);

  const loadAccess = useCallback(async () => {
    accessRequest.current.controller?.abort();
    const controller = new AbortController();
    const generation = accessRequest.current.generation + 1;
    accessRequest.current = { generation, controller };
    setAccess({ status: 'loading' });
    try {
      const { data, error } = await supabase.functions.invoke('get-mastermind-portal-access', { body: {} });
      if (controller.signal.aborted || accessRequest.current.generation !== generation) return;
      setAccess(error ? { status: 'unavailable' } : normalizeAccessResponse(data));
    } catch {
      if (!controller.signal.aborted && accessRequest.current.generation === generation) setAccess({ status: 'unavailable' });
    }
  }, []);
  useEffect(() => { void loadAccess(); }, [loadAccess]);

  const resolvePlayback = useCallback(async (nextTarget: PlaybackTarget, options: { recovery?: boolean; deepLink?: boolean } = {}) => {
    const key = targetKey(nextTarget);
    if (!options.recovery && playback?.resourceId === nextTarget.resourceId && ((nextTarget.momentId && playback.momentId === nextTarget.momentId) || (!nextTarget.momentId && nextTarget.questionId && playback.questionId === nextTarget.questionId)) && Number.isFinite(playback.startSeconds)) {
      setTarget({ ...nextTarget, startSeconds: playback.startSeconds });
      setActivationNonce((value) => value + 1);
      setPlaybackError(null);
      return true;
    }
    playbackRequest.current.controller?.abort();
    const controller = new AbortController();
    const generation = playbackRequest.current.generation + 1;
    playbackRequest.current = { generation, controller };
    if (options.recovery) setRecoveryBusy(true); else setLoadingKey(key);
    setPlaybackError(null);
    if (!options.recovery) setRecoveryFailed(false);
    try {
      const { data, error } = await supabase.functions.invoke('get-mastermind-playback-link', { body: { resourceId: nextTarget.resourceId, questionId: nextTarget.questionId, momentId: nextTarget.momentId, responseShape: 'verified_cue_v1' } });
      if (controller.signal.aborted || playbackRequest.current.generation !== generation) return false;
      const result = error ? null : validatePlaybackResponse(data, nextTarget);
      if (!result) {
        if (options.recovery) setRecoveryFailed(true); else setPlaybackError('This protected answer is temporarily unavailable. Your access has not changed.');
        return false;
      }
      resetForSource();
      setSourceGeneration((value) => value + 1);
      setPlayback(result);
      setTarget({ ...nextTarget, startSeconds: options.recovery ? recoverySnapshotRef.current.time : result.startSeconds });
      setActivationNonce((value) => value + 1);
      setRecoveryFailed(false);
      return true;
    } catch {
      if (!controller.signal.aborted && playbackRequest.current.generation === generation) {
        if (options.recovery) setRecoveryFailed(true); else setPlaybackError('This protected answer is temporarily unavailable. Your access has not changed.');
      }
      return false;
    } finally {
      if (!controller.signal.aborted && playbackRequest.current.generation === generation) { setLoadingKey(null); setRecoveryBusy(false); }
    }
  }, [playback, resetForSource]);

  useEffect(() => {
    if (!detailKey) {
      deepLinkAttemptedRef.current = null;
      setDeepLink({ key: null, status: 'idle' });
    }
  }, [detailKey]);

  useEffect(() => {
    if (!canUseVault(access) || !detailTarget || !detailKey || deepLinkAttemptedRef.current === detailKey || deepLinkBusyRef.current) return;
    deepLinkAttemptedRef.current = detailKey;
    deepLinkBusyRef.current = true;
    setDeepLink({ key: detailKey, status: 'loading' });
    void resolvePlayback({ ...detailTarget, title: 'Protected replay', startSeconds: null }, { deepLink: true }).then((ok) => { deepLinkBusyRef.current = false; setDeepLink((current) => current.key === detailKey ? { key: detailKey, status: ok ? 'success' : 'error' } : current); });
  }, [access, detailKey, detailTarget, resolvePlayback]);

  const retryDeepLink = () => {
    if (!detailTarget || !detailKey || deepLinkBusyRef.current) return;
    deepLinkAttemptedRef.current = detailKey;
    deepLinkBusyRef.current = true;
    setDeepLink({ key: detailKey, status: 'loading' });
    void resolvePlayback({ ...detailTarget, title: 'Protected replay', startSeconds: null }, { deepLink: true }).then((ok) => { deepLinkBusyRef.current = false; setDeepLink((current) => current.key === detailKey ? { key: detailKey, status: ok ? 'success' : 'error' } : current); });
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const cleanQuery = query.trim().slice(0, 160);
    if (cleanQuery.length < 2 || !canUseVault(access)) return;
    searchRequest.current.controller?.abort();
    const controller = new AbortController();
    const generation = searchRequest.current.generation + 1;
    searchRequest.current = { generation, controller };
    setSearching(true); setSubmittedQuery(cleanQuery); setSearchError(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-mastermind-resources', { body: { query: cleanQuery, limit: 20, momentsPerReplay: 8, responseShape: 'grouped_moments_v1' } });
      if (controller.signal.aborted || searchRequest.current.generation !== generation) return;
      setGroups(error ? [] : groupSearchResults(data));
      if (error) setSearchError('Search is temporarily unavailable. Your access has not changed.');
    } catch {
      if (!controller.signal.aborted && searchRequest.current.generation === generation) { setGroups([]); setSearchError('Search is temporarily unavailable. Your access has not changed.'); }
    } finally { if (!controller.signal.aborted && searchRequest.current.generation === generation) setSearching(false); }
  };

  const handleOpen = (nextTarget: PlaybackTarget) => { recoveryAttemptsRef.current = 0; void resolvePlayback(nextTarget); };
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
    if (media) media.currentTime = Math.min(recoverySnapshotRef.current.time || target?.startSeconds || 0, Number.isFinite(media.duration) ? Math.max(0, media.duration - 0.25) : Infinity);
    if (media && recoverySnapshotRef.current.shouldResume) { recoverySnapshotRef.current.shouldResume = false; void media.play().catch(() => undefined); }
  };
  const handleMediaError = () => { if (!recoveryBusy && shouldAutoRefresh(recoveryAttemptsRef.current)) void refreshPlayback(false); else setRecoveryFailed(true); };

  useEffect(() => {
    if (!playback?.expiresAt || playback.provider === 'youtube') return;
    const refreshIn = new Date(playback.expiresAt).getTime() - Date.now() - 30_000;
    if (!Number.isFinite(refreshIn) || refreshIn <= 0) return;
    const timer = window.setTimeout(() => { if (shouldAutoRefresh(recoveryAttemptsRef.current)) void refreshPlayback(false); }, Math.min(refreshIn, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [playback?.expiresAt, playback?.provider, refreshPlayback]);

  return (
    <Layout>
      <section data-auth-return-to={makeAuthReturnTo(location)} data-motion-safe className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-clip px-0.5 motion-reduce:scroll-auto">
        <header className="space-y-2"><Badge variant="secondary" className="w-fit">Becoming Boss Mastermind</Badge><h1 ref={headingRef} className="text-3xl font-bold tracking-tight" tabIndex={-1}>Replay Vault</h1><p className="max-w-2xl text-muted-foreground">Find one useful answer and jump straight to it.</p></header>
        {access.status === 'loading' && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Checking Replay Vault access…</p>}
        {access.status === 'unavailable' && <Card role="alert"><CardHeader><CardTitle className="flex items-center gap-2"><WifiOff className="h-5 w-5" aria-hidden="true" />Access check unavailable</CardTitle><CardDescription>We could not verify access right now. This does not mean your membership changed.</CardDescription></CardHeader><CardContent><Button type="button" onClick={() => void loadAccess()}>Try again</Button></CardContent></Card>}
        {access.status === 'allowed' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Library className="h-5 w-5 text-primary" aria-hidden="true" />Full Replay Vault</CardTitle><CardDescription>Your access includes the full approved replay library.</CardDescription></CardHeader></Card>}
        {access.status === 'limited' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" aria-hidden="true" />Current replays</CardTitle><CardDescription>You can search the approved current replay window. Older archive results stay private.</CardDescription></CardHeader></Card>}
        {access.status === 'not_launched' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" aria-hidden="true" />Replay Vault is not open yet</CardTitle><CardDescription>Your membership is recognized. This Replay Vault is currently disabled or limited to the pilot group.</CardDescription></CardHeader></Card>}
        {access.status === 'denied' && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" aria-hidden="true" />Replay access not included</CardTitle><CardDescription>Sign in with the email connected to an active Mastermind membership.</CardDescription></CardHeader></Card>}
        {canUseVault(access) && <>
          <Card><CardHeader><CardTitle>What do you need help with?</CardTitle><CardDescription id="vault-search-help">Search approved titles and transcript moments available to you.</CardDescription></CardHeader><CardContent><form role="search" onSubmit={handleSearch} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1 space-y-2"><label htmlFor="vault-search" className="text-sm font-medium">Search Replay Vault</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input ref={searchInputRef} id="vault-search" value={query} maxLength={160} aria-describedby="vault-search-help" onChange={(event) => setQuery(event.target.value)} placeholder="Try pricing, capacity, or sales" className="min-h-11 min-w-0 pl-10" /></div></div><Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={query.trim().length < 2}>{searching ? 'Searching…' : 'Search Vault'}</Button></form><p className="sr-only" role="status" aria-live="polite">{searching ? 'Searching approved replays.' : submittedQuery ? `${groups.length} matching replays.` : ''}</p></CardContent></Card>
          {searchError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{searchError}</p>}
          {deepLink.status === 'error' && <div role="alert" className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3"><p className="text-sm">That protected answer could not be opened. Your access has not changed.</p><Button type="button" variant="outline" className="w-fit" onClick={retryDeepLink}>Try answer again</Button></div>}
          {playbackError && deepLink.status !== 'error' && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{playbackError}</p>}
          {playback && target && <VaultPlayer playback={playback} target={target} videoRef={videoRef} announcement={announcement} sourceGeneration={sourceGeneration} recoveryBusy={recoveryBusy} recoveryFailed={recoveryFailed} onLoadedMetadata={handleLoadedMetadata} onMediaError={handleMediaError} onManualRefresh={() => void refreshPlayback(true)} />}
          {groups.length > 0 && <VaultSearchResults groups={groups} loadingKey={loadingKey} onOpen={handleOpen} />}
          {!searching && submittedQuery && groups.length === 0 && !searchError && <Card><CardHeader><CardTitle>No approved moments found</CardTitle><CardDescription>Try fewer words or a broader topic. Your search is still in the box.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2 sm:flex-row"><Button type="button" onClick={() => searchInputRef.current?.focus()}>Edit search</Button><Button type="button" variant="outline" onClick={() => { setQuery(''); setSubmittedQuery(''); setGroups([]); searchInputRef.current?.focus(); }}>Clear search</Button></CardContent></Card>}
        </>}
      </section>
    </Layout>
  );
}
