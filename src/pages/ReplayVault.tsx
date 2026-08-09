import { FormEvent, useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Library, Lock, PlayCircle, Search } from 'lucide-react';

interface PortalAccess {
  hasMastermindAccess: boolean;
  hasFullReplayVault: boolean;
  replayAccess: 'full_vault' | 'current_30_day' | 'none';
  scopes: string[];
}

interface VaultSearchResult {
  resourceId: string;
  title: string;
  productTitle: string;
  categoryTitle: string | null;
  portalPath: string;
  accessScope: string;
  stages: string[];
  resourceType: string;
  snippet: string;
  startsAtSeconds: number | null;
  reason: string;
}

interface PlaybackResult {
  resourceId: string;
  title: string;
  provider: string;
  playbackUrl: string;
  expiresAt: string | null;
  accessScope: string;
}

function formatTime(seconds: number | null) {
  if (seconds === null) return 'Start replay';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function ReplayVault() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [access, setAccess] = useState<PortalAccess | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VaultSearchResult[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playback, setPlayback] = useState<PlaybackResult | null>(null);
  const [pendingStartSeconds, setPendingStartSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data, error: accessError } = await supabase.functions.invoke('get-mastermind-portal-access', {
        body: {},
      });

      if (cancelled) return;
      if (accessError) {
        setError('We could not verify your Replay Vault access.');
        setAccess(null);
      } else {
        setAccess(data as PortalAccess);
      }
      setAccessLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2 || !access?.hasMastermindAccess) return;

    setSearching(true);
    setError(null);
    setPlayback(null);

    const { data, error: searchError } = await supabase.functions.invoke('search-mastermind-resources', {
      body: { query: cleanQuery, limit: 20 },
    });

    if (searchError) {
      setResults([]);
      setError('Search is temporarily unavailable. Your access has not changed.');
    } else {
      setResults((data?.results ?? []) as VaultSearchResult[]);
    }
    setSearching(false);
  };

  const openResult = async (result: VaultSearchResult) => {
    setPlaybackLoading(true);
    setError(null);

    const { data, error: playbackError } = await supabase.functions.invoke('get-mastermind-playback-link', {
      body: { resourceId: result.resourceId },
    });

    if (playbackError) {
      setError('This replay is not ready for protected playback yet.');
      setPlayback(null);
    } else {
      setPlayback(data as PlaybackResult);
      setPendingStartSeconds(result.startsAtSeconds);
    }
    setPlaybackLoading(false);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && pendingStartSeconds !== null) {
      videoRef.current.currentTime = pendingStartSeconds;
    }
  };

  const isYouTube = playback?.provider === 'youtube';
  const youtubeUrl = isYouTube && pendingStartSeconds !== null
    ? `${playback.playbackUrl}?start=${Math.max(0, Math.floor(pendingStartSeconds))}`
    : playback?.playbackUrl;

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">Becoming Boss Mastermind</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Replay Vault</h1>
          <p className="text-muted-foreground">
            Search the conversations, jump to the useful moment, and keep moving.
          </p>
        </div>

        {accessLoading && <p className="text-sm text-muted-foreground">Checking Replay Vault access…</p>}

        {!accessLoading && access?.replayAccess === 'full_vault' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5 text-primary" />
                Full Replay Vault
              </CardTitle>
              <CardDescription>Your annual or lifetime access includes the full approved replay library.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!accessLoading && access?.replayAccess === 'current_30_day' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Current replays
              </CardTitle>
              <CardDescription>
                Your membership includes core curriculum and the current 30-day replay window. The full Replay Vault is reserved for annual and lifetime members.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!accessLoading && (!access || access.replayAccess === 'none') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Replay access unavailable</CardTitle>
              <CardDescription>Sign in with the email connected to your active Mastermind membership.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {access?.hasMastermindAccess && (
          <Card>
            <CardHeader>
              <CardTitle>What do you need help with?</CardTitle>
              <CardDescription>Search titles and approved transcript moments available to your membership.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search pricing, email list, capacity, sales…"
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={searching || query.trim().length < 2}>
                  {searching ? 'Searching…' : 'Search Vault'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {playback && (
          <Card>
            <CardHeader>
              <CardTitle>{playback.title}</CardTitle>
              {pendingStartSeconds !== null && (
                <CardDescription>Starting at {formatTime(pendingStartSeconds)}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isYouTube ? (
                <iframe
                  title={playback.title}
                  src={youtubeUrl}
                  className="aspect-video w-full rounded-lg border"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  key={playback.playbackUrl}
                  controls
                  preload="metadata"
                  className="aspect-video w-full rounded-lg bg-black"
                  onLoadedMetadata={handleLoadedMetadata}
                >
                  <source src={playback.playbackUrl} />
                  Your browser does not support protected video playback.
                </video>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {results.map((result) => (
            <Card key={`${result.resourceId}-${result.startsAtSeconds ?? 'start'}`}>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  {result.stages.slice(0, 2).map((stage) => <Badge key={stage} variant="outline">{stage}</Badge>)}
                  <Badge variant="secondary">{formatTime(result.startsAtSeconds)}</Badge>
                </div>
                <CardTitle className="text-base">{result.title}</CardTitle>
                <CardDescription>{result.snippet || result.reason}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void openResult(result)} disabled={playbackLoading}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {playbackLoading ? 'Opening…' : result.startsAtSeconds === null ? 'Watch replay' : 'Watch this answer'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!searching && query.trim().length >= 2 && results.length === 0 && access?.hasMastermindAccess && !error && (
          <p className="py-8 text-center text-sm text-muted-foreground">No approved replay moments matched that search.</p>
        )}
      </div>
    </Layout>
  );
}
