import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Plus, X, Mic, Youtube, Instagram } from 'lucide-react';
import { LaunchWizardData, VideoContent, PodcastAppearance, VIDEO_PLATFORM_OPTIONS } from '@/types/launch';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';

interface LaunchVideoStrategyProps {
  data: LaunchWizardData;
  onChange: (updates: Partial<LaunchWizardData>) => void;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  tiktok: <Video className="h-4 w-4" />,
};

export function LaunchVideoStrategy({ data, onChange }: LaunchVideoStrategyProps) {
  const [newVideo, setNewVideo] = useState<Partial<VideoContent>>({
    platform: 'youtube',
    topic: '',
    scheduledDate: '',
  });
  
  const [newPodcast, setNewPodcast] = useState<Partial<PodcastAppearance>>({
    showName: '',
    topic: '',
    recordingDate: '',
  });

  const addVideo = () => {
    if (!newVideo.topic?.trim()) return;
    
    const video: VideoContent = {
      id: crypto.randomUUID(),
      platform: newVideo.platform || 'youtube',
      topic: newVideo.topic.trim(),
      scheduledDate: newVideo.scheduledDate || '',
    };
    
    onChange({ videoContent: [...(data.videoContent || []), video] });
    setNewVideo({ platform: 'youtube', topic: '', scheduledDate: '' });
  };

  const removeVideo = (id: string) => {
    onChange({ videoContent: data.videoContent.filter(v => v.id !== id) });
  };

  const addPodcast = () => {
    if (!newPodcast.showName?.trim()) return;
    
    const podcast: PodcastAppearance = {
      id: crypto.randomUUID(),
      showName: newPodcast.showName.trim(),
      topic: newPodcast.topic?.trim() || '',
      recordingDate: newPodcast.recordingDate || '',
    };
    
    onChange({ podcastAppearances: [...(data.podcastAppearances || []), podcast] });
    setNewPodcast({ showName: '', topic: '', recordingDate: '' });
  };

  const removePodcast = (id: string) => {
    onChange({ podcastAppearances: data.podcastAppearances.filter(p => p.id !== id) });
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Video className="h-4 w-4 text-primary" />
            Video & Podcast Strategy
          </CardTitle>
          <CardDescription>
            Video and podcast content builds deep trust. Even 1-2 pieces can make a big impact.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Video Content Section */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Video Content</Label>
          <p className="text-sm text-muted-foreground mt-1">
            What videos will you create to support your launch?
          </p>
        </div>

        {/* Add new video */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Platform</Label>
                <Select
                  value={newVideo.platform}
                  onValueChange={(value) => setNewVideo(prev => ({ ...prev, platform: value as VideoContent['platform'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_PLATFORM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {PLATFORM_ICONS[opt.value]}
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Date (optional)</Label>
                <Input
                  type="date"
                  value={newVideo.scheduledDate}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, scheduledDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">&nbsp;</Label>
                <Button onClick={addVideo} disabled={!newVideo.topic?.trim()} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
            <Input
              value={newVideo.topic || ''}
              onChange={(e) => setNewVideo(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="Video topic or title..."
              onKeyDown={(e) => e.key === 'Enter' && addVideo()}
            />
          </CardContent>
        </Card>

        {/* Video list */}
        {data.videoContent?.length > 0 && (
          <div className="space-y-2">
            {data.videoContent.map(video => (
              <div
                key={video.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {PLATFORM_ICONS[video.platform]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{video.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {VIDEO_PLATFORM_OPTIONS.find(o => o.value === video.platform)?.label}
                      {video.scheduledDate && ` • ${formatDisplayDate(video.scheduledDate)}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVideo(video.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!data.videoContent?.length && (
          <p className="text-sm text-muted-foreground italic">
            No videos planned yet. Even one teaching video can dramatically increase trust.
          </p>
        )}
      </div>

      {/* Podcast Appearances */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Podcast Appearances
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Guest appearances on other podcasts can expand your reach dramatically.
          </p>
        </div>

        {/* Add new podcast */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={newPodcast.showName || ''}
                onChange={(e) => setNewPodcast(prev => ({ ...prev, showName: e.target.value }))}
                placeholder="Podcast show name..."
              />
              <Input
                type="date"
                value={newPodcast.recordingDate}
                onChange={(e) => setNewPodcast(prev => ({ ...prev, recordingDate: e.target.value }))}
                placeholder="Recording date"
              />
            </div>
            <div className="flex gap-3">
              <Input
                value={newPodcast.topic || ''}
                onChange={(e) => setNewPodcast(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="Topic you'll discuss..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addPodcast()}
              />
              <Button onClick={addPodcast} disabled={!newPodcast.showName?.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Podcast list */}
        {data.podcastAppearances?.length > 0 && (
          <div className="space-y-2">
            {data.podcastAppearances.map(podcast => (
              <div
                key={podcast.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{podcast.showName}</p>
                    <p className="text-xs text-muted-foreground">
                      {podcast.topic && `"${podcast.topic}"`}
                      {podcast.recordingDate && ` • Recording: ${formatDisplayDate(podcast.recordingDate)}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePodcast(podcast.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!data.podcastAppearances?.length && (
          <p className="text-sm text-muted-foreground italic">
            No podcast appearances planned. Consider reaching out to 3-5 podcasts in your niche.
          </p>
        )}
      </div>

      {/* Summary */}
      {(data.videoContent?.length > 0 || data.podcastAppearances?.length > 0) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {data.videoContent?.length > 0 && (
                <Badge variant="secondary">
                  <Video className="h-3 w-3 mr-1" />
                  {data.videoContent.length} video{data.videoContent.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {data.podcastAppearances?.length > 0 && (
                <Badge variant="secondary">
                  <Mic className="h-3 w-3 mr-1" />
                  {data.podcastAppearances.length} podcast{data.podcastAppearances.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}