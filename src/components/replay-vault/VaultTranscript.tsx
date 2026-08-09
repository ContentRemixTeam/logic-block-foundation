import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { activeCueIndex, normalizeTranscript } from './replayVaultLibraryCore.mjs';
import { formatCompactTime, formatSpokenTime } from './replayVaultCore.mjs';
import type { PlaybackTarget } from './types';

type Cue = { cueId: string; cueIndex: number; startSeconds: number; endSeconds: number | null; text: string };
const PAGE_SIZE = 100;
const MAX_PAGES = 200;

export function VaultTranscript({ resourceId, title, currentTime, onOpen }: {
  resourceId: string;
  title: string;
  currentTime: number;
  onOpen: (target: PlaybackTarget) => void;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [cues, setCues] = useState<Cue[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setCues([]);
    setSelected(null);
    try {
      const all: Cue[] = [];
      let afterIndex = -1;
      let complete = false;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const { data, error } = await supabase.functions.invoke('vault-member-library', {
          body: { action: 'transcript', resourceId, afterIndex, limit: PAGE_SIZE },
        });
        const rows = error ? null : normalizeTranscript(data, resourceId) as Cue[] | null;
        if (!rows) {
          setState('error');
          return;
        }
        if (rows.some((cue, index) => cue.cueIndex <= afterIndex || (index > 0 && cue.cueIndex <= rows[index - 1].cueIndex))) {
          setState('error');
          return;
        }
        all.push(...rows);
        if (rows.length < PAGE_SIZE) {
          complete = true;
          break;
        }
        afterIndex = rows[rows.length - 1].cueIndex;
      }
      if (!complete) {
        setState('error');
        return;
      }
      setCues(all);
      setState(all.length ? 'ready' : 'empty');
    } catch {
      setState('error');
    }
  }, [resourceId]);

  useEffect(() => { void load(); }, [load]);
  const active = useMemo(() => activeCueIndex(cues, currentTime), [cues, currentTime]);

  return (
    <section aria-labelledby="vault-transcript-heading" className="space-y-3 rounded-lg border p-3" data-vault-transcript>
      <div>
        <h3 id="vault-transcript-heading" className="font-semibold">Full transcript</h3>
        <p className="text-sm text-muted-foreground">Complete authorized text alternative. Choose a cue to seek to its exact approved time.</p>
      </div>
      {state === 'loading' && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading the complete authorized transcript…</p>}
      {state === 'error' && (
        <div role="alert" className="space-y-2">
          <p className="text-sm">The complete transcript is temporarily unavailable, so partial text has not been shown as complete. This does not mean your access changed.</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => void load()}>Retry transcript</Button>
        </div>
      )}
      {state === 'empty' && <p role="status" className="text-sm text-muted-foreground">No approved transcript text is available for this replay yet. Video captions are unavailable unless the protected media contract supplies a caption file.</p>}
      {state === 'ready' && (
        <ol className="max-h-96 space-y-1 overflow-y-auto" aria-label={`Transcript cues for ${title}`}>
          {cues.map((cue, index) => (
            <li key={cue.cueId}>
              <button
                type="button"
                aria-current={index === active ? 'true' : undefined}
                data-selected={cue.cueId === selected ? 'true' : undefined}
                className="min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[current=true]:border-primary aria-[current=true]:bg-primary/10 data-[selected=true]:border-primary"
                aria-label={`Seek ${title} to ${formatSpokenTime(cue.startSeconds)}. ${cue.text}`}
                onClick={() => {
                  setSelected(cue.cueId);
                  onOpen({ resourceId, title, startSeconds: cue.startSeconds, questionId: null, momentId: cue.cueId });
                }}
              >
                <span className="mr-2 font-semibold text-primary">{formatCompactTime(cue.startSeconds)}</span>
                {cue.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
