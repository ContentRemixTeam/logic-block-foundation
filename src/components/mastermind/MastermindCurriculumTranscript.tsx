import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { activeCueIndex, normalizeCursor, normalizeTranscript } from '@/components/replay-vault/replayVaultLibraryCore.mjs';
import { formatCompactTime, formatSpokenTime, isStableVaultId } from '@/components/replay-vault/replayVaultCore.mjs';
import type { PlaybackTarget } from '@/components/replay-vault/types';

type TranscriptState = 'loading' | 'ready' | 'empty' | 'error';

type CurriculumCue = {
  cueId: string;
  cueIndex: number;
  startSeconds: number;
  endSeconds: number | null;
  text: string;
};

const PAGE_SIZE = 100;
const MAX_PAGES = 500;

export function MastermindCurriculumTranscript({
  resourceId,
  title,
  currentTime,
  onOpen,
}: {
  resourceId: string;
  title: string;
  currentTime: number;
  onOpen: (target: PlaybackTarget) => void;
}) {
  const [state, setState] = useState<TranscriptState>('loading');
  const [cues, setCues] = useState<CurriculumCue[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const own = ++generation.current;
    setState('loading');
    setCues([]);
    setSelectedCueId(null);

    if (!isStableVaultId(resourceId)) {
      setState('empty');
      return;
    }

    try {
      const all: CurriculumCue[] = [];
      let cursor: string | null = null;

      for (let page = 0; page < MAX_PAGES; page += 1) {
        const { data, error } = await supabase.functions.invoke('vault-member-library', {
          body: {
            action: 'transcript',
            resourceId,
            cursor,
            limit: PAGE_SIZE,
          },
        });

        if (own !== generation.current) return;
        const next = error ? null : normalizeTranscript(data, resourceId) as CurriculumCue[] | null;
        const nextCursor = error ? undefined : normalizeCursor(data);
        if (!next || nextCursor === undefined || next.some((cue, index) => index > 0 && cue.cueIndex <= next[index - 1].cueIndex)) {
          setState('error');
          return;
        }

        all.push(...next);
        if (!nextCursor) {
          setCues(all);
          setState(all.length ? 'ready' : 'empty');
          return;
        }

        cursor = nextCursor;
      }

      setState('error');
    } catch {
      if (own === generation.current) setState('error');
    }
  }, [resourceId]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  useEffect(() => {
    setQuery('');
  }, [resourceId]);

  const activeIndex = useMemo(() => activeCueIndex(cues, currentTime), [cues, currentTime]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleCues = useMemo(() => (
    normalizedQuery
      ? cues.filter((cue) => cue.text.toLocaleLowerCase().includes(normalizedQuery))
      : cues
  ), [cues, normalizedQuery]);

  return (
    <section aria-labelledby="curriculum-transcript-heading" className="space-y-3 rounded-lg border p-4" data-curriculum-transcript>
      <div>
        <h2 id="curriculum-transcript-heading" className="font-semibold">Timestamps and transcript</h2>
        <p className="text-sm text-muted-foreground">
          Search this training, then click a timestamp to jump to the exact part you need.
        </p>
      </div>

      {state === 'loading' && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading approved timestamps...</p>
      )}

      {state === 'error' && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Timestamps are temporarily unavailable. The video is still safe to watch and your access has not changed.
          </p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => void load()}>
            Retry timestamps
          </Button>
        </div>
      )}

      {state === 'empty' && (
        <p role="status" className="text-sm text-muted-foreground">No approved timestamps are available for this training yet.</p>
      )}

      {state === 'ready' && (
        <>
          <div className="space-y-2">
            <label htmlFor="curriculum-transcript-search" className="text-sm font-medium">Search within this video</label>
            <Input
              id="curriculum-transcript-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value.slice(0, 160))}
              placeholder="Find a word or phrase in this training"
              className="min-h-11"
            />
            <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
              {normalizedQuery
                ? `${visibleCues.length} matching timestamp${visibleCues.length === 1 ? '' : 's'} in this video.`
                : `${cues.length} timestamp${cues.length === 1 ? '' : 's'} in this video.`}
            </p>
          </div>

          {visibleCues.length > 0 ? (
            <ol className="max-h-96 space-y-1 overflow-y-auto" aria-label={`Timestamps for ${title}`}>
              {visibleCues.map((cue) => {
                const index = cues.indexOf(cue);

                return (
                  <li key={cue.cueId}>
                    <button
                      type="button"
                      aria-current={index === activeIndex ? 'true' : undefined}
                      data-selected={cue.cueId === selectedCueId ? 'true' : undefined}
                      className="min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[current=true]:border-primary aria-[current=true]:bg-primary/10 data-[selected=true]:border-primary"
                      aria-label={`Jump ${title} to ${formatSpokenTime(cue.startSeconds)}. ${cue.text}`}
                      onClick={() => {
                        setSelectedCueId(cue.cueId);
                        onOpen({ resourceId, title, startSeconds: cue.startSeconds, questionId: null, momentId: cue.cueId });
                      }}
                    >
                      <span className="mr-2 font-semibold text-primary">{formatCompactTime(cue.startSeconds)}</span>
                      {cue.text}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No matching timestamp in this video.</p>
          )}
        </>
      )}
    </section>
  );
}
