import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ExternalLink, 
  Star, 
  Trophy,
  HelpCircle,
  Users,
  Video,
  Ticket,
  GraduationCap,
  Calendar,
  MessageCircle,
  Archive,
  Pin,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MastermindResource {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  questIcon: string;
  url: string;
  isExternal: boolean;
}

const MASTERMIND_RESOURCES: MastermindResource[] = [
  {
    id: 'celebration-wall',
    title: 'Celebration Wall',
    description: 'Share your wins and celebrate with the community',
    icon: <Trophy className="h-6 w-6" />,
    questIcon: '🏆',
    url: '/community',
    isExternal: false,
  },
  {
    id: 'ask-faith',
    title: 'Ask Faith',
    description: 'Submit your questions to get personalized guidance',
    icon: <HelpCircle className="h-6 w-6" />,
    questIcon: '🙋',
    url: 'https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462',
    isExternal: true,
  },
  {
    id: 'coworking-room',
    title: 'Coworking Room',
    description: 'Join virtual coworking sessions with fellow members',
    icon: <Users className="h-6 w-6" />,
    questIcon: '👥',
    url: 'https://gobrunch.com/events/389643/589970',
    isExternal: true,
  },
  {
    id: 'recent-replays',
    title: 'Recent Call Replays',
    description: 'Watch the latest mastermind call recordings',
    icon: <Video className="h-6 w-6" />,
    questIcon: '🎬',
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/learning?productId=8cd48d79-e6dd-4e11-9e4c-5d643703bad1',
    isExternal: true,
  },
  {
    id: 'replay-vault',
    title: 'Replay Vault',
    description: 'Access the complete archive of past recordings',
    icon: <Archive className="h-6 w-6" />,
    questIcon: '🗄️',
    url: 'https://hub-3pwl3413w2.membership.io/',
    isExternal: true,
  },
  {
    id: 'events',
    title: 'Events',
    description: 'View upcoming mastermind events and sessions',
    icon: <Calendar className="h-6 w-6" />,
    questIcon: '📅',
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/events',
    isExternal: true,
  },
  {
    id: 'apply-events',
    title: 'Apply for Upcoming Events',
    description: 'Apply to attend exclusive live events',
    icon: <Ticket className="h-6 w-6" />,
    questIcon: '🎟️',
    url: 'https://www.faithmariahevents.com/',
    isExternal: true,
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Connect and engage with fellow mastermind members',
    icon: <MessageCircle className="h-6 w-6" />,
    questIcon: '💬',
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/home',
    isExternal: true,
  },
  {
    id: 'learning',
    title: 'Learning',
    description: 'Access courses, trainings, and educational content',
    icon: <GraduationCap className="h-6 w-6" />,
    questIcon: '📚',
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/learning',
    isExternal: true,
  },
];

const STORAGE_KEY = 'mastermind-pinned-resources';

export default function MastermindHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Load pinned resources from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPinnedIds(JSON.parse(stored));
      } catch {
        setPinnedIds([]);
      }
    }
  }, []);

  // Save pinned resources to localStorage
  const savePinned = (ids: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    setPinnedIds(ids);
  };

  const togglePin = (id: string) => {
    if (pinnedIds.includes(id)) {
      savePinned(pinnedIds.filter(p => p !== id));
    } else if (pinnedIds.length < 3) {
      savePinned([...pinnedIds, id]);
    }
  };

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return MASTERMIND_RESOURCES;
    const query = searchQuery.toLowerCase();
    return MASTERMIND_RESOURCES.filter(
      r => r.title.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const pinnedResources = useMemo(() => {
    return MASTERMIND_RESOURCES.filter(r => pinnedIds.includes(r.id));
  }, [pinnedIds]);

  const unpinnedResources = useMemo(() => {
    return filteredResources.filter(r => !pinnedIds.includes(r.id));
  }, [filteredResources, pinnedIds]);

  const handleOpen = (resource: MastermindResource) => {
    if (resource.isExternal) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = resource.url;
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Mastermind Hub</h1>
          <p className="text-muted-foreground">Everything you need in one place</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources..."
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Pinned Section */}
        {pinnedResources.length > 0 && !searchQuery && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Pinned</h2>
              <Badge variant="secondary" className="text-xs">{pinnedResources.length}/3</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinnedResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  isPinned={true}
                  onTogglePin={() => togglePin(resource.id)}
                  onOpen={() => handleOpen(resource)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Resources */}
        <div className="space-y-3">
          {!searchQuery && pinnedResources.length > 0 && (
            <h2 className="font-semibold text-sm">All Resources</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(searchQuery ? filteredResources : unpinnedResources).map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                isPinned={pinnedIds.includes(resource.id)}
                canPin={pinnedIds.length < 3}
                onTogglePin={() => togglePin(resource.id)}
                onOpen={() => handleOpen(resource)}
              />
            ))}
          </div>
          
          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No resources found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

interface ResourceCardProps {
  resource: MastermindResource;
  isPinned: boolean;
  canPin?: boolean;
  onTogglePin: () => void;
  onOpen: () => void;
}

function ResourceCard({ resource, isPinned, canPin = true, onTogglePin, onOpen }: ResourceCardProps) {
  return (
    <Card className={cn(
      "group hover:shadow-md transition-all duration-200",
      isPinned && "ring-2 ring-primary/20 bg-primary/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg",
              isPinned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <span className="text-2xl">{resource.questIcon}</span>
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-1.5">
                {resource.title}
                {resource.isExternal && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                )}
              </CardTitle>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0",
              isPinned ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100",
              !canPin && !isPinned && "cursor-not-allowed"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (canPin || isPinned) onTogglePin();
            }}
            title={isPinned ? "Unpin" : canPin ? "Pin to top" : "Max 3 pins allowed"}
          >
            <Star className={cn("h-4 w-4", isPinned && "fill-current")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <CardDescription className="text-sm line-clamp-2">
          {resource.description}
        </CardDescription>
        <Button 
          onClick={onOpen} 
          className="w-full"
          variant={isPinned ? "default" : "secondary"}
        >
          Open
          {resource.isExternal && <ExternalLink className="ml-2 h-3.5 w-3.5" />}
        </Button>
      </CardContent>
    </Card>
  );
}
