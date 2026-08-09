import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Library, Lock, Search, WifiOff } from 'lucide-react';
import { VaultPlayer } from '@/components/replay-vault/VaultPlayer';
import { VaultSearchResults } from '@/components/replay-vault/VaultSearchResults';
import {
  groupSearchResults,
  normalizeAccessResponse,
  parseDetailTarget,
  shouldAutoRefresh,
} from '@/components/replay-vault/replayVaultCore.mjs';
import type {
  PlaybackResult,
  PlaybackTarget,
  VaultAccessState,
  VaultReplayGroup,
} from '@/components/replay-vault/types';
import { useVaultSeekCoordinator } from '@/components/replay-vault/useVaultSeekCoordinator';

type VaultView = 'search' | 'browse' | 'questions' | 'saved';

function canUseVault(access: VaultAccessState) {
  return access.status === 'allowed' || access.status === 'limited';
}

export default function ReplayVault() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const recoverySnapshotRef = useRef({ time: 0, shouldResume: false });
  const recoveryAttemptsRef = useRef(0);
  const [access, setAccess] = useState<VaultAccessState>({ status: 'loading' });
  const [view, setView] = useState<VaultView>('search');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [groups, setGroups] = useState<VaultReplayGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackResult | null>(null);
  const [target, setTarget] = useState<PlaybackTarget | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);

  const detailTarget = useMemo(() => parseDetailTarget(window.location.search), []);
  const { announcement, onLoadedMetadata, resetForSource } = useVaultSeekCoordinator({
    mediaRef: videoRef,
    targetSeconds: target?.startSeconds ?? null,
    targetKey: target ? `${target.resourceId}:${target.momentId ?? target.questionId ?? target.startSeconds ?? 'start'}` : null,
  });

  const loadAccess = useCallback(async () => {
    setAccess({ status: 'loading' });
    const { data, error } = await supabase.functions.invoke('get-mastermind-portal-access', { body: {} });
    if (error) {
      setAccess({ status: 'unavailable' });
      return;
    }
    setAccess(normalizeAccessResponse(data));
  }, []);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const resolvePlayback = useCallback(async (
    nextTarget: PlaybackTarget,
    options: { recovery?: boolean; manual?: boolean } = {},
  ) => {
    const rowKey = `${nextTarget.resourceId}:${nextTarget.momentId ?? nextTarget.questionId ?? 'replay'}`;
    if (!options.recovery && playback?.resourceId === nextTarget.resourceId) {
      setTarget(nextTarget);
      setPlaybackError(null);
      requestAnimationFrame(() => document.getElementById('vault-player')?.focus({ preventScroll: true }));
      return;
    }

    if (options.recovery) setRecoveryBusy(true);
    else setLoadingKey(rowKey);
    setPlaybackError(null);
    if (!options.recovery) setRecoveryFailed(false);

    const { data, error } = await supabase.functions.invoke('get-mastermind-playback-link', {
      body: {
        resourceId: nextTarget.resourceId,
        questionId: nextTarget.questionId,
        momentId: nextTarget.momentId,
      },
    });

    if (error || !data?.playbackUrl) {
      if (options.recovery) setRecoveryFailed(true);
      else {
        setPlayback(null);
        setPlaybackError('This protected replay is temporarily unavailable. Your access has not changed.');
      }
    } else {
      const result = data as PlaybackResult;
      const serverVerifiedStart = options.recovery
        ? recoverySnapshotRef.current.time
        : Number.isFinite(result.startSeconds)
          ? Number(result.startSeconds)
          : nextTarget.startSeconds;
      resetForSource();
      setPlayback(result);
      setTarget({ ...nextTarget, startSeconds: serverVerifiedStart });
      setRecoveryFailed(false);
      requestAnimationFrame(() => document.getElementById('vault-player')?.focus({ preventScroll: true }));
    }

    setLoadingKey(null);
    setRecoveryBusy(false);
  }, [playback?.resourceId, resetForSource]);

  useEffect(() => {
    if (!canUseVault(access) || !detailTarget || playback || loadingKey) return;
    // Deep-link identifiers are sent back to the protected resolver. Client URL timestamps are never trusted.
    void resolvePlayback({
      resourceId: detailTarget.resourceId,
      title: 'Protected replay',
      startSeconds: null,
      questionId: detailTarget.questionId,
      momentId: detailTarget.momentId,
    });
  }, [access, detailTarget, loadingKey, playback, resolvePlayback]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const cleanQuery = query.trim().slice(0, 160);
    if (cleanQuery.length < 2 || !canUseVault(access)) return;
    setSearching(true);
    setSubmittedQuery(cleanQuery);
    setSearchError(null);
    const { data, error } = await supabase.functions.invoke('search-mastermind-resources', {
      body: { query: cleanQuery, limit: 20, momentsPerReplay: 8 },
    });
    setGroups(error ? [] : groupSearchResults(data));
    if (error) setSearchError('Search is temporarily unavailable. Your access has not changed.');
    setSearching(false);
  };

  const handleOpen = (nextTarget: PlaybackTarget) => {
    recoveryAttemptsRef.current = 0;
    void resolvePlayback(nextTarget);
  };

  const refreshPlayback = useCallback(async (manual = false) => {
    if (!target || !playback) return;
    const media = videoRef.current;
    recoverySnapshotRef.current = {
      time: media?.currentTime ?? target.startSeconds ?? 0,
      shouldResume: Boolean(media && !media.paused),
    };
    media?.pause();
    if (!manual) recoveryAttemptsRef.current += 1;
    await resolvePlayback(target, { recovery: true, manual });
  }, [playback, resolvePlayback, target]);

  const handleLoadedMetadata = () => {
    onLoadedMetadata();
    const media = videoRef.current;
    if (media && recoverySnapshotRef.current.shouldResume) {
      recoverySnapshotRef.current.shouldResume = false;
      void media.play().catch(() => undefined);
    }
  };

  const handleMediaError = () => {
    if (shouldAutoRefresh(recoveryAttemptsRef.current)) void refreshPlayback(false);
    else setRecoveryFailed(true);
  };

  return (
    <Layout>
      <main id="replay-vault-content" className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-clip px-0.5">
        <header className="space-y-2">
          <Badge variant="secondary" className="w-fit">Becoming Boss Mastermind</Badge>
          <h1 className="text-3xl font-bold tracking-tight" tabIndex={-1}>Replay Vault</h1>
          <p className="max-w-2xl text-muted-foreground">Find one useful answer and jump straight to it.</p>
        </header>

        {access.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Checking Replay Vault access…</p>}

        {access.status === 'unavailable' && (
          <Card role="alert">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><WifiOff className="h-5 w-5" aria-hidden="true" />Access check unavailable</CardTitle>
              <CardDescription>We could not verify access right now. This does not mean your membership changed.</CardDescription>
            </CardHeader>
            <CardContent><Button type="button" onClick={() => void loadAccess()}>Try again</Button></CardContent>
          </Card>
        )}

        {access.status === 'allowed' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Library className="h-5 w-5 text-primary" aria-hidden="true" />Full Replay Vault</CardTitle>
              <CardDescription>Your access includes the full approved replay library.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {access.status === 'limited' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" aria-hidden="true" />Current replays</CardTitle>
              <CardDescription>You can search the approved current replay window. Older archive results stay private.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {access.status === 'denied' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" aria-hidden="true" />Replay access not included</CardTitle>
              <CardDescription>Sign in with the email connected to an active Mastermind membership.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {canUseVault(access) && (
          <>
            <nav aria-label="Replay Vault views" className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {(['search', 'browse', 'questions', 'saved'] as VaultView[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={view === item ? 'default' : 'outline'}
                  className="min-h-11 shrink-0 capitalize"
                  aria-current={view === item ? 'page' : undefined}
                  onClick={() => setView(item)}
                >
                  {item}
                </Button>
              ))}
            </nav>

            {view === 'search' ? (
              <Card>
                <CardHeader>
                  <CardTitle>What do you need help with?</CardTitle>
                  <CardDescription id="vault-search-help">Search approved titles and transcript moments available to you.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form role="search" onSubmit={handleSearch} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-2">
                      <label htmlFor="vault-search" className="text-sm font-medium">Search Replay Vault</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          ref={searchInputRef}
                          id="vault-search"
                          value={query}
                          maxLength={160}
                          aria-describedby="vault-search-help"
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Try pricing, capacity, or sales"
                          className="min-h-11 min-w-0 pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={searching || query.trim().length < 2}>
                      {searching ? 'Searching…' : 'Search Vault'}
                    </Button>
                  </form>
                  <p className="sr-only" role="status" aria-live="polite">
                    {searching ? 'Searching approved replays.' : submittedQuery ? `${groups.length} matching replays.` : ''}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{view === 'browse' ? 'Browse' : view === 'questions' ? 'Questions answered' : 'Saved'}</CardTitle>
                  <CardDescription>
                    {view === 'browse'
                      ? 'Recent and category browsing will appear after the approved catalog API is available.'
                      : view === 'questions'
                        ? 'Approved questions will appear after the reviewed Questions API is available.'
                        : 'Saved replays will appear after protected bookmarks are available.'}
                  </CardDescription>
                </CardHeader>
                <CardContent><Button type="button" variant="outline" onClick={() => { setView('search'); requestAnimationFrame(() => searchInputRef.current?.focus()); }}>Search approved replays</Button></CardContent>
              </Card>
            )}

            {searchError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{searchError}</p>}
            {playbackError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{playbackError}</p>}

            {playback && target && (
              <VaultPlayer
                playback={playback}
                target={target}
                videoRef={videoRef}
                announcement={announcement}
                recoveryBusy={recoveryBusy}
                recoveryFailed={recoveryFailed}
                onLoadedMetadata={handleLoadedMetadata}
                onMediaError={handleMediaError}
                onManualRefresh={() => void refreshPlayback(true)}
              />
            )}

            {groups.length > 0 && <VaultSearchResults groups={groups} loadingKey={loadingKey} onOpen={handleOpen} />}

            {!searching && submittedQuery && groups.length === 0 && !searchError && (
              <Card>
                <CardHeader>
                  <CardTitle>No approved moments found</CardTitle>
                  <CardDescription>Try fewer words, or search a broader topic. Your search is still in the box.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => searchInputRef.current?.focus()}>Edit search</Button>
                  <Button type="button" variant="outline" onClick={() => { setQuery(''); setSubmittedQuery(''); setGroups([]); searchInputRef.current?.focus(); }}>Clear search</Button>
                  <Button type="button" variant="outline" onClick={() => setView('browse')}>Browse status</Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
