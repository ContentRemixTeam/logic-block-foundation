import { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { formatCompactTime } from './replayVaultCore.mjs';
import type { PlaybackResult, PlaybackTarget } from './types';
import { VaultInteractionBar } from './VaultInteractionBar';
import { VaultTranscript } from './VaultTranscript';
import { VaultCallQuestions } from './VaultCallQuestions';
interface VaultPlayerProps { playback: PlaybackResult; target: PlaybackTarget; videoRef: RefObject<HTMLVideoElement>; announcement: string; sourceGeneration: number; recoveryBusy: boolean; recoveryFailed: boolean; onLoadedMetadata: () => void; onMediaError: () => void; onManualRefresh: () => void; onOpen: (target: PlaybackTarget) => void; }
export function VaultPlayer({ playback, target, videoRef, announcement, sourceGeneration, recoveryBusy, recoveryFailed, onLoadedMetadata, onMediaError, onManualRefresh, onOpen }: VaultPlayerProps) {
  const isYouTube = playback.provider === 'youtube';
  const youtubeUrl = isYouTube ? `${playback.playbackUrl}${playback.playbackUrl.includes('?') ? '&' : '?'}start=${Math.max(0, Math.floor(target.startSeconds ?? 0))}` : null;
  return (
    <Card id="vault-player" className="min-w-0 scroll-mt-4 overflow-hidden" data-motion-safe tabIndex={-1}>
      <CardHeader><CardTitle className="break-words">{playback.title}</CardTitle><CardDescription>{target.startSeconds === null ? 'Playing from the start' : `Playing answer at ${formatCompactTime(target.startSeconds)}`}</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {isYouTube ? (
          <>
            <iframe key={`${playback.playbackUrl}:${target.momentId ?? target.startSeconds ?? 0}`} title={`Protected replay: ${playback.title}`} src={youtubeUrl ?? undefined} className="aspect-video w-full max-w-full rounded-lg border" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            <p className="rounded-md border p-3 text-sm text-muted-foreground">Automatic playback recovery is not available for YouTube. If this player stops, return to the answer and open it again.</p>
          </>
        ) : (
          <video ref={videoRef} key={sourceGeneration} data-source-generation={sourceGeneration} controls playsInline preload="metadata" className="aspect-video w-full max-w-full rounded-lg bg-black" onLoadedMetadata={onLoadedMetadata} onError={onMediaError} aria-label={`Protected replay: ${playback.title}`}>
            <source src={playback.playbackUrl} />Your browser does not support protected video playback.
          </video>
        )}
        <VaultInteractionBar playback={playback} target={target} videoRef={videoRef} sourceGeneration={sourceGeneration} />
        <VaultCallQuestions resourceId={playback.resourceId} title={playback.title} onOpen={onOpen} />
        <VaultTranscript resourceId={playback.resourceId} title={playback.title} videoRef={videoRef} onOpen={onOpen} />
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
        {!isYouTube && recoveryBusy && <p role="status" className="text-sm text-muted-foreground">Refreshing protected playback…</p>}
        {!isYouTube && recoveryFailed && (
          <div role="alert" className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">The protected video could not be refreshed. Your access has not changed.</p>
            <Button type="button" variant="outline" className="min-h-11" disabled={recoveryBusy} onClick={onManualRefresh}><RefreshCw className="mr-2 h-4 w-4 motion-reduce:animate-none" aria-hidden="true" /> Refresh video</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
