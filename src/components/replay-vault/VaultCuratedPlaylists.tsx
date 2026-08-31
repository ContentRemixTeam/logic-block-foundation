import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ListVideo, PlayCircle, RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { groupSearchResults } from './replayVaultCore.mjs';
import type { PlaybackTarget, VaultReplayGroup } from './types';
import { findVaultPlaylist, VAULT_PLAYLISTS } from './vaultPlaylists.mjs';

interface Props { onOpen: (target: PlaybackTarget) => void; }
type Playlist = { slug: string; title: string; description: string; query?: string; itemCount?: number };
type ApprovedItem = { playlistId: string; resourceId: string; title: string; category: string; position: number; startMs: number | null; why: string; speaker: string | null };

function validPlaylists(data: unknown): Playlist[] {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { playlists?: unknown }).playlists)) return [];
  return (data as { playlists: Array<Record<string, unknown>> }).playlists.flatMap((row) =>
    typeof row.slug === 'string' && typeof row.title === 'string' && typeof row.description === 'string'
      ? [{ slug: row.slug, title: row.title, description: row.description, itemCount: Number(row.itemCount ?? 0) }]
      : []);
}

function validItems(data: unknown): ApprovedItem[] {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) return [];
  return (data as { items: Array<Record<string, unknown>> }).items.flatMap((row) =>
    typeof row.playlistId === 'string' && typeof row.resourceId === 'string' && typeof row.title === 'string'
      ? [{ playlistId: row.playlistId, resourceId: row.resourceId, title: row.title, category: String(row.category || 'Replay'), position: Number(row.position), startMs: row.startMs == null ? null : Number(row.startMs), why: String(row.why || ''), speaker: row.speaker ? String(row.speaker) : null }]
      : []);
}

export function VaultCuratedPlaylists({ onOpen }: Props) {
  const requestGeneration = useRef(0);
  const [playlists, setPlaylists] = useState<Playlist[]>(VAULT_PLAYLISTS);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [groups, setGroups] = useState<VaultReplayGroup[]>([]);
  const [approvedItems, setApprovedItems] = useState<ApprovedItem[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle');
  const selected = selectedSlug ? playlists.find((playlist) => playlist.slug === selectedSlug) ?? findVaultPlaylist(selectedSlug) : null;

  useEffect(() => {
    let current = true;
    void supabase.functions.invoke('vault-playlists', { body: { action: 'list' } }).then(({ data, error }) => {
      const approved = error ? [] : validPlaylists(data);
      if (current && approved.length) setPlaylists(approved);
    }).catch(() => undefined);
    return () => { current = false; };
  }, []);

  const openPlaylist = async (slug: string) => {
    const playlist = playlists.find((item) => item.slug === slug) ?? findVaultPlaylist(slug);
    if (!playlist) return;
    const own = ++requestGeneration.current;
    setSelectedSlug(slug); setGroups([]); setApprovedItems([]); setState('loading');
    try {
      const approvedResponse = await supabase.functions.invoke('vault-playlists', { body: { action: 'items', slug } });
      if (own !== requestGeneration.current) return;
      const approved = approvedResponse.error ? [] : validItems(approvedResponse.data);
      if (approved.length) { setApprovedItems(approved); setState('ready'); return; }
      if (!playlist.query) { setState('empty'); return; }
      const { data, error } = await supabase.functions.invoke('search-mastermind-resources', { body: { query: playlist.query, limit: 8, momentsPerReplay: 1, filters: { includeMetadataFallback: true }, responseShape: 'grouped_moments_v1', preview: true } });
      if (own !== requestGeneration.current) return;
      if (error) { setState('error'); return; }
      const next = groupSearchResults(data).slice(0, 8);
      setGroups(next); setState(next.length ? 'ready' : 'empty');
    } catch { if (own === requestGeneration.current) setState('error'); }
  };

  const closePlaylist = () => { requestGeneration.current += 1; setSelectedSlug(null); setGroups([]); setApprovedItems([]); setState('idle'); };
  const resultCount = approvedItems.length || groups.length;

  if (!selected) return (
    <section aria-labelledby="vault-playlists-heading" className="space-y-4" data-vault-playlists>
      <div><h2 id="vault-playlists-heading" className="flex items-center gap-2 text-xl font-semibold"><ListVideo className="h-5 w-5 text-primary" aria-hidden="true" />Choose what you need help with</h2><p className="text-sm text-muted-foreground">Focused collections organized around the questions members ask most often.</p></div>
      <ul className="grid min-w-0 gap-3 md:grid-cols-2">{playlists.map((playlist, index) => <li key={playlist.slug}><Card className="h-full min-w-0"><CardHeader className="space-y-2"><Badge variant={index === 0 ? 'default' : 'outline'} className="w-fit">{index === 0 ? 'Start here' : 'Focused collection'}</Badge><CardTitle className="break-words text-lg">{playlist.title}</CardTitle><CardDescription>{playlist.description}</CardDescription></CardHeader><CardContent><Button type="button" variant={index === 0 ? 'default' : 'outline'} className="min-h-11 w-full" onClick={() => void openPlaylist(playlist.slug)}>Open collection{playlist.itemCount ? ` (${playlist.itemCount})` : ''}</Button></CardContent></Card></li>)}</ul>
    </section>
  );

  return (
    <section aria-labelledby="vault-playlist-detail-heading" className="space-y-4" data-vault-playlist-detail>
      <Button type="button" variant="ghost" className="min-h-11 px-2" onClick={closePlaylist}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />All collections</Button>
      <div><Badge variant="secondary" className="mb-2">Focused collection</Badge><h2 id="vault-playlist-detail-heading" className="text-xl font-semibold">{selected.title}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.description}</p></div>
      {state === 'loading' && <p role="status" aria-live="polite" className="text-sm text-muted-foreground"><RotateCw className="mr-2 inline h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Finding approved replays available to you…</p>}
      {state === 'error' && <div role="alert" className="space-y-2 rounded-md border p-3"><p className="text-sm">This collection is temporarily unavailable. Your access has not changed.</p><Button type="button" variant="outline" className="min-h-11" onClick={() => void openPlaylist(selected.slug)}>Try again</Button></div>}
      {state === 'empty' && <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">No approved matches are available in this collection yet. Try searching the full library above.</p>}
      {state === 'ready' && <><p className="text-sm text-muted-foreground">{resultCount} approved replay{resultCount === 1 ? '' : 's'}</p><ul className="grid min-w-0 gap-3 sm:grid-cols-2">
        {approvedItems.map((item) => <li key={`${item.playlistId}:${item.resourceId}`}><Card className="h-full min-w-0"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{item.position}</Badge><Badge variant="outline">{item.category}</Badge></div><CardTitle className="break-words text-lg">{item.title}</CardTitle><CardDescription>{item.why}{item.speaker ? ` · ${item.speaker}` : ''}</CardDescription></CardHeader><CardContent><Button type="button" className="min-h-11 w-full" onClick={() => onOpen({ resourceId: item.resourceId, title: item.title, startSeconds: item.startMs == null ? null : item.startMs / 1000, questionId: null, momentId: null })}><PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />Watch this replay</Button></CardContent></Card></li>)}
        {groups.map((group, index) => { const moment = group.moments[0]; return <li key={group.resourceId}><Card className="h-full min-w-0"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{index + 1}</Badge><Badge variant="outline">{group.category}</Badge></div><CardTitle className="break-words text-lg">{group.title}</CardTitle><CardDescription>{moment.snippet || moment.reason || 'Open this approved replay.'}</CardDescription></CardHeader><CardContent><Button type="button" className="min-h-11 w-full" onClick={() => onOpen({ resourceId: group.resourceId, title: group.title, startSeconds: moment.startSeconds, questionId: moment.questionId, momentId: moment.momentId })}><PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />Watch this answer</Button></CardContent></Card></li>; })}
      </ul></>}
    </section>
  );
}
