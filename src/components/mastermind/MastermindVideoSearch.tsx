import { useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { MastermindVideo } from '@/data/mastermindVideoLibrary';
import { REPLAY_VAULT_PILOT_VIDEOS as PILOT_VIDEOS } from '@/data/replayVaultPilotVideos';
import { useMastermindSuccessPath } from '@/hooks/useMastermindSuccessPath';
import { getMastermindStage } from '@/lib/mastermindSuccessPath';
import { Clock, Compass, Library, PlayCircle, Search, Sparkles, WifiOff, X } from 'lucide-react';
import { filterPilotVideos, pilotRecommendationReason, pilotTranscriptSnippet, rankPilotRecommendation } from './mastermindVideoSearchCore.mjs';

const STAGES = ['All', 'Offer', 'Find', 'Nurture', 'Sell', 'Deliver', 'Leverage'];

function VideoCard({ video, query, recommended, onPlay }: { video: MastermindVideo; query: string; recommended: boolean; onPlay: (video: MastermindVideo) => void }) {
  return <Card className="min-w-0 overflow-hidden">
    <button type="button" onClick={() => onPlay(video)} className="group relative block w-full bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label={`Play ${video.title}`}>
      <img src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`} alt="" className="aspect-video w-full object-cover" loading="lazy" />
      <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/20"><span className="rounded-full bg-background/95 p-3 shadow"><PlayCircle className="h-7 w-7 text-primary" aria-hidden="true" /></span></span>
    </button>
    <CardHeader className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{video.stage}</Badge>{recommended && <Badge className="gap-1"><Sparkles className="h-3 w-3" aria-hidden="true" />For you</Badge>}<span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{video.duration}</span></div>
      <CardTitle className="text-base leading-snug">{video.title}</CardTitle><CardDescription>{video.summary}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {query && <div className="rounded-md bg-muted/60 p-3"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transcript match</p><p className="line-clamp-4 text-sm text-muted-foreground">{pilotTranscriptSnippet(video, query)}</p></div>}
      <Button type="button" className="min-h-11 w-full" onClick={() => onPlay(video)}><PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />Watch training</Button>
    </CardContent>
  </Card>;
}

export default function MastermindVideoSearch() {
  const { data, isLoading, error } = useMastermindSuccessPath();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('All');
  const [selected, setSelected] = useState<MastermindVideo | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const stageId = data?.selectedStageId ?? data?.successPath?.stageId ?? 'offer';
  const stageDefinition = getMastermindStage(stageId);
  const context = useMemo(() => ({
    stageId,
    stageLabel: stageDefinition.label,
    milestoneTitle: data?.snapshot?.current_milestone_title ?? stageDefinition.milestones[0].label,
    capacityMode: data?.snapshot?.capacity_mode ?? null,
    goal: data?.cycle.goal ?? '',
    focusArea: data?.cycle.focus_area ?? '',
    bottleneck: data?.cycle.biggest_bottleneck ?? '',
    lowEnergyVersion: data?.cycle.low_energy_version ?? '',
  }), [data, stageDefinition, stageId]);
  const recommendation = useMemo(() => rankPilotRecommendation(PILOT_VIDEOS, context), [context]);
  const recommendedVideo = recommendation?.video as MastermindVideo | undefined;
  const visibleVideos = useMemo(() => filterPilotVideos(PILOT_VIDEOS, query, stage), [query, stage]);
  const play = (video: MastermindVideo) => { setSelected(video); window.requestAnimationFrame(() => playerRef.current?.focus({ preventScroll: false })); };

  return <div className="space-y-6" data-replay-vault-pilot>
    <header className="space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge>Private pilot</Badge><Badge variant="outline">Public test videos only</Badge></div><h1 className="text-3xl font-bold tracking-tight">Replay Vault</h1><p className="max-w-2xl text-muted-foreground">Find one useful training for the plan you are working right now.</p></header>
    {isLoading && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Reading your Success Path and current planner…</p>}
    {error && <Card role="alert"><CardHeader><CardTitle className="flex items-center gap-2"><WifiOff className="h-5 w-5" aria-hidden="true" />Planner context unavailable</CardTitle><CardDescription>The library still works. Recommendations are using the default Offer stage until your planner can be read.</CardDescription></CardHeader></Card>}
    {recommendedVideo && <Card className="border-primary/30 bg-primary/5"><CardHeader className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Sparkles className="h-5 w-5 text-primary" aria-hidden="true" /><Badge variant="secondary">Recommended for your plan</Badge></div><CardTitle>{recommendedVideo.title}</CardTitle><CardDescription>{pilotRecommendationReason(context, recommendation)}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><div className="min-w-0 space-y-2 text-sm"><p><span className="font-semibold">Success Path:</span> {stageDefinition.label}</p><p className="truncate"><span className="font-semibold">Current milestone:</span> {context.milestoneTitle}</p>{context.goal && <p className="line-clamp-2"><span className="font-semibold">Planner goal:</span> {context.goal}</p>}</div><Button type="button" className="min-h-11 w-full md:w-auto" onClick={() => play(recommendedVideo)}><PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />Watch this first</Button></CardContent></Card>}
    {selected && <Card ref={playerRef} tabIndex={-1} aria-labelledby="pilot-player-title"><CardHeader><Badge variant="secondary" className="w-fit">{selected.stage}</Badge><CardTitle id="pilot-player-title">{selected.title}</CardTitle><CardDescription>{selected.summary}</CardDescription></CardHeader><CardContent><div className="aspect-video overflow-hidden rounded-lg bg-black"><iframe key={selected.videoId} className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${selected.videoId}?rel=0&autoplay=1`} title={selected.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" aria-hidden="true" />Search the pilot library</CardTitle><CardDescription>Search titles, topics, keywords, and full transcripts.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value.slice(0, 160))} placeholder="Try sales page, email list, capacity, or implementation" className="min-h-11 pl-10 pr-11" aria-label="Search Replay Vault pilot" />{query && <Button type="button" variant="ghost" size="icon" aria-label="Clear replay search" className="absolute right-1 top-1/2 min-h-10 min-w-10 -translate-y-1/2" onClick={() => setQuery('')}><X className="h-4 w-4" /></Button>}</div><div className="flex flex-wrap gap-2" aria-label="Filter by Success Path stage">{STAGES.map((item) => <Button key={item} type="button" variant={stage === item ? 'default' : 'outline'} className="min-h-11" aria-pressed={stage === item} onClick={() => setStage(item)}>{item}</Button>)}</div><p role="status" aria-live="polite" className="text-sm text-muted-foreground">{visibleVideos.length} training{visibleVideos.length === 1 ? '' : 's'} shown.</p></CardContent></Card>
    <section aria-labelledby="pilot-library-title" className="space-y-4"><div><h2 id="pilot-library-title" className="flex items-center gap-2 text-xl font-semibold"><Library className="h-5 w-5 text-primary" aria-hidden="true" />Browse by Success Path</h2><p className="text-sm text-muted-foreground">This safe pilot uses a small public catalog before private replays are added.</p></div>{visibleVideos.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleVideos.map((video) => <VideoCard key={video.id} video={video} query={query} recommended={video.id === recommendedVideo?.id} onPlay={play} />)}</div> : <Card><CardHeader><CardTitle>No matching training</CardTitle><CardDescription>Try a broader phrase or choose All stages.</CardDescription></CardHeader><CardContent><Button type="button" variant="outline" onClick={() => { setQuery(''); setStage('All'); }}><Compass className="mr-2 h-4 w-4" />Show all pilot videos</Button></CardContent></Card>}</section>
  </div>;
}
