import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headphones, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PodcastEpisode {
  id: string;
  title: string;
  episodeNumber: number;
  publishedDate: string;
  artwork: string | null;
  duration: number;
  isNew: boolean;
}

interface PodcastData {
  latestEpisode: PodcastEpisode | null;
  listenUrl: string | null;
  totalEpisodes: number;
}

export function PodcastWidget() {
  const [data, setData] = useState<PodcastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPodcastData = async () => {
      try {
        const { data: responseData, error: fnError } = await supabase.functions.invoke('get-podcast-episodes');
        
        if (fnError) {
          console.error('Error fetching podcast:', fnError);
          setError('Failed to load podcast');
          return;
        }

        setData(responseData);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load podcast');
      } finally {
        setLoading(false);
      }
    };

    fetchPodcastData();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.latestEpisode) {
    return null; // Don't show widget if there's an error or no episodes
  }

  const { latestEpisode, listenUrl } = data;

  return (
    <Card className={`border-border/50 transition-all ${latestEpisode.isNew ? 'ring-2 ring-primary/30 border-primary/50' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-primary" />
            Latest Episode
          </span>
          {latestEpisode.isNew && (
            <Badge variant="default" className="text-xs">
              NEW
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-medium text-sm line-clamp-2">
            {latestEpisode.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>Episode {latestEpisode.episodeNumber}</span>
            <span>•</span>
            <span>{format(new Date(latestEpisode.publishedDate), 'MMM d, yyyy')}</span>
            {latestEpisode.duration > 0 && (
              <>
                <span>•</span>
                <span>{formatDuration(latestEpisode.duration)}</span>
              </>
            )}
          </div>
        </div>
        
        {listenUrl && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            asChild
          >
            <a href={listenUrl} target="_blank" rel="noopener noreferrer">
              Listen Now
              <ExternalLink className="h-3 w-3 ml-2" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
