import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { newStableRequestId } from '@/lib/successPathLearningSlice';
import { ArrowDown, Loader2, PlayCircle, RefreshCw } from 'lucide-react';

interface PlaybackResponse {
  assignmentItemId: string;
  title: string;
  provider: 'private_media';
  playbackUrl: string;
  expiresAt: string;
}

interface Props {
  cycleId: string;
  assignmentItemId: string;
  title: string;
  onBackToAction: () => void;
}

const KEYS = ['assignmentItemId', 'expiresAt', 'playbackUrl', 'provider', 'title'];

function parsePlayback(value: unknown, expectedItem: string): PlaybackResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Playback response unavailable');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join('|') !== KEYS.sort().join('|') || row.assignmentItemId !== expectedItem ||
      row.provider !== 'private_media' || typeof row.title !== 'string' || row.title.length > 160 ||
      typeof row.playbackUrl !== 'string' || !row.playbackUrl.startsWith('https://') ||
      typeof row.expiresAt !== 'string' || !Number.isFinite(Date.parse(row.expiresAt))) {
    throw new Error('Playback response could not be verified');
  }
  return row as unknown as PlaybackResponse;
}

export function AssignedLearningPlayer({ cycleId, assignmentItemId, title, onBackToAction }: Props) {
  const [opened, setOpened] = useState(false);
  const [playback, setPlayback] = useState<PlaybackResponse | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'refreshing' | 'unavailable'>('idle');
  const requestId = useRef(newStableRequestId());
  const videoRef = useRef<HTMLVideoElement>(null);
  const position = useRef(0);
  const statusRef = useRef<HTMLDivElement>(null);
  const playerFocusFrame = useRef<number | null>(null);
  const actionHandoff = useRef(false);

  const loadPlayback = useCallback(async (refresh = false) => {
    setState(refresh ? 'refreshing' : 'loading');
    try {
      position.current = videoRef.current?.currentTime ?? position.current;
      const { data, error } = await supabase.functions.invoke('get-assigned-learning-playback', {
        body: { cycleId, assignmentItemId, requestId: requestId.current },
      });
      if (error) throw error;
      setPlayback(parsePlayback(data, assignmentItemId));
      setState('ready');
    } catch {
      setState('unavailable');
      if (!actionHandoff.current) requestAnimationFrame(() => statusRef.current?.focus());
    }
  }, [assignmentItemId, cycleId]);

  useEffect(() => {
    if (!playback) return;
    const refreshIn = Math.max(1_000, Date.parse(playback.expiresAt) - Date.now() - 5 * 60 * 1000);
    const timer = window.setTimeout(() => void loadPlayback(true), refreshIn);
    return () => window.clearTimeout(timer);
  }, [loadPlayback, playback]);

  useEffect(() => {
    if (state === 'ready') {
      playerFocusFrame.current = requestAnimationFrame(() => videoRef.current?.focus());
    }
    return () => {
      if (playerFocusFrame.current !== null) cancelAnimationFrame(playerFocusFrame.current);
      playerFocusFrame.current = null;
    };
  }, [state]);

  const backToAction = () => {
    if (playerFocusFrame.current !== null) cancelAnimationFrame(playerFocusFrame.current);
    playerFocusFrame.current = null;
    actionHandoff.current = true;
    onBackToAction();
  };

  const open = () => {
    actionHandoff.current = false;
    setOpened(true);
    void loadPlayback(false);
  };

  if (!opened) {
    return <Button className="min-h-11 w-full sm:w-auto" onClick={open}><PlayCircle className="mr-2 h-4 w-4" />Watch this lesson</Button>;
  }

  return (
    <div className="space-y-3 min-w-0">
      <div ref={statusRef} tabIndex={state === 'unavailable' ? -1 : undefined} role={state === 'unavailable' ? 'alert' : 'status'} aria-live="polite" className="text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
        {state === 'loading' && <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Preparing your protected lesson…</span>}
        {state === 'refreshing' && 'Refreshing the private playback link. Your position is preserved…'}
        {state === 'unavailable' && 'The lesson player is temporarily unavailable. Your membership and plan have not changed.'}
      </div>
      {playback && state !== 'loading' && (
        <video
          ref={videoRef}
          className="aspect-video w-full max-w-full rounded-lg bg-black"
          src={playback.playbackUrl}
          aria-label={`${title} protected lesson player`}
          tabIndex={-1}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onLoadedMetadata={(event) => { if (position.current > 0) event.currentTarget.currentTime = position.current; }}
          onTimeUpdate={(event) => { position.current = event.currentTarget.currentTime; }}
          onError={() => { if (state === 'ready') void loadPlayback(true); }}
        />
      )}
      {state === 'unavailable' && <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => { actionHandoff.current = false; void loadPlayback(true); }}><RefreshCw className="mr-2 h-4 w-4" />Try playback again</Button>}
      <Button variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={backToAction}><ArrowDown className="mr-2 h-4 w-4" />Back to my action</Button>
    </div>
  );
}
