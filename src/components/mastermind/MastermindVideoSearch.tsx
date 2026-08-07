import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type MastermindVideo, VIDEO_SEARCH_TERMS, YOUTUBE_TEST_VIDEOS } from '@/data/mastermindVideoLibrary';
import { Clock, ExternalLink, PlayCircle, Search, Video, X } from 'lucide-react';

const TOTAL_TRANSCRIPT_WORDS = YOUTUBE_TEST_VIDEOS.reduce(
  (sum, video) => sum + video.transcriptWordCount,
  0
);

function getVideoSearchValues(video: MastermindVideo) {
  return [
    video.title,
    video.duration,
    video.stage,
    video.summary,
    video.transcriptPreview,
    video.transcript,
    video.keywords.join(' '),
  ];
}

function getTranscriptSnippet(video: MastermindVideo, rawQuery: string) {
  const transcript = video.transcript || video.transcriptPreview;
  const query = rawQuery.trim().toLowerCase();

  if (!query || !transcript) {
    return video.transcriptPreview;
  }

  const matchIndex = transcript.toLowerCase().indexOf(query);
  if (matchIndex === -1) {
    return video.transcriptPreview;
  }

  const start = Math.max(0, matchIndex - 120);
  const end = Math.min(transcript.length, matchIndex + query.length + 220);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < transcript.length ? '...' : '';

  return `${prefix}${transcript.slice(start, end).trim()}${suffix}`;
}

interface StatusPillProps {
  title: string;
  value: string;
}

function StatusPill({ title, value }: StatusPillProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-medium leading-snug">{value}</p>
    </div>
  );
}

export default function MastermindVideoSearch() {
  const [videoSearchQuery, setVideoSearchQuery] = useState('');

  const filteredVideos = useMemo(() => {
    if (!videoSearchQuery.trim()) return YOUTUBE_TEST_VIDEOS;
    const query = videoSearchQuery.toLowerCase();
    return YOUTUBE_TEST_VIDEOS.filter((video) =>
      getVideoSearchValues(video).some((value) => value.toLowerCase().includes(query))
    );
  }, [videoSearchQuery]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            YouTube search test
          </CardTitle>
          <CardDescription>
            Public Faith Mariah YouTube videos are indexed with pulled auto-captions so you can test
            transcript search before paying for private video hosting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <StatusPill title="Searches" value="Titles, summaries, topics, full pulled captions" />
            <StatusPill
              title="Transcript source"
              value={`${TOTAL_TRANSCRIPT_WORDS.toLocaleString()} words from YouTube auto-captions`}
            />
            <StatusPill title="Access logic" value="Core, 30-day replay, and vault tags can use the same index" />
          </div>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={videoSearchQuery}
              onChange={(e) => setVideoSearchQuery(e.target.value)}
              placeholder="Search sales page, email list, low capacity, AI..."
              className="pl-10"
            />
            {videoSearchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setVideoSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {VIDEO_SEARCH_TERMS.map((term) => (
              <Button
                key={term}
                type="button"
                variant={videoSearchQuery === term ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVideoSearchQuery(term)}
              >
                {term}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredVideos.map((video) => (
          <Card key={video.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="block bg-muted">
              <img
                src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                alt={`${video.title} thumbnail`}
                className="aspect-video w-full object-cover"
                loading="lazy"
              />
            </a>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{video.stage}</Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {video.duration}
                </span>
              </div>
              <CardTitle className="text-base leading-snug">{video.title}</CardTitle>
              <CardDescription>{video.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide">Transcript snippet</p>
                  <span className="text-[11px]">
                    {video.transcriptWordCount.toLocaleString()} words
                  </span>
                </div>
                <p>{getTranscriptSnippet(video, videoSearchQuery)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[11px]">
                  {video.transcriptSource}
                </Badge>
                {video.keywords.slice(0, 4).map((keyword) => (
                  <Badge key={keyword} variant="outline" className="text-[11px]">
                    {keyword}
                  </Badge>
                ))}
              </div>
              <Button className="w-full" onClick={() => window.open(video.url, '_blank', 'noopener,noreferrer')}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Watch on YouTube
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No videos found matching "{videoSearchQuery}"</p>
        </div>
      )}
    </div>
  );
}
