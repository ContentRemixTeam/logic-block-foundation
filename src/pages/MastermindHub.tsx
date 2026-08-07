import { useState, useMemo, useEffect, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MastermindGate } from '@/components/membership/MastermindGate';
import { type MastermindVideo, VIDEO_SEARCH_TERMS, YOUTUBE_TEST_VIDEOS } from '@/data/mastermindVideoLibrary';
import {
  Archive,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Clock,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  ListChecks,
  MessageCircle,
  Pin,
  PlayCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trophy,
  Users,
  Video,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StageId = 'offer' | 'find' | 'nurture' | 'sell' | 'deliver' | 'leverage';

interface RoadmapStage {
  id: StageId;
  label: string;
  memberQuestion: string;
  useWhen: string;
  milestone: string;
  definitionOfDone: string[];
  resources: string[];
  supportPrompt: string;
}

interface MastermindResource {
  id: string;
  title: string;
  description: string;
  access: string;
  icon: ComponentType<{ className?: string }>;
  url: string;
  isExternal: boolean;
}

const ROADMAP_STAGES: RoadmapStage[] = [
  {
    id: 'offer',
    label: 'Offer',
    memberQuestion: 'What are you selling?',
    useWhen: 'Use this when the offer, buyer, price, promise, or demand evidence is still fuzzy.',
    milestone: 'Choose one money focus and create a minimum viable offer test.',
    definitionOfDone: [
      'Offer statement is clear enough to say out loud',
      'Buyer, problem, price, and delivery model are decided',
      'Real people have been invited to validate or buy'
    ],
    resources: ['Create Results Foundation', 'Offer Stage Intro', 'Minimum Viable Offer Test'],
    supportPrompt: 'What part of this offer is still private theory instead of market evidence?'
  },
  {
    id: 'find',
    label: 'Find',
    memberQuestion: 'How will the right people find you?',
    useWhen: 'Use this when the offer is clear but too few qualified people are discovering you.',
    milestone: 'Pick one discovery path and repeat it long enough to create evidence.',
    definitionOfDone: [
      'One discovery channel is chosen',
      'There is a simple bridge into email or another owned audience',
      'Four weeks of discovery evidence have been reviewed'
    ],
    resources: ['Find Stage Intro', 'Simple Discovery Plan', 'Email Bridge Lesson'],
    supportPrompt: 'Where are qualified people already close enough to notice your work this quarter?'
  },
  {
    id: 'nurture',
    label: 'Nurture',
    memberQuestion: 'How will you warm them up?',
    useWhen: 'Use this when people find you, but they are not joining, engaging, understanding the offer, or getting ready to buy.',
    milestone: 'Create a simple welcome and email rhythm that builds readiness.',
    definitionOfDone: [
      'Discovery connects to a clear next step',
      'A welcome or nurture path exists',
      'Audience behavior is being watched for replies, clicks, questions, or sales signals'
    ],
    resources: ['Nurture Stage Intro', 'Simple Email System', 'Content With a Job'],
    supportPrompt: 'What does your audience need to believe, understand, or trust before the offer makes sense?'
  },
  {
    id: 'sell',
    label: 'Sell',
    memberQuestion: 'How will you make the offer?',
    useWhen: 'Use this when the offer and warm audience exist, but invitations, follow-up, or conversion are weak.',
    milestone: 'Run one complete sales cycle with follow-up and a real debrief.',
    definitionOfDone: [
      'Sales goal and simple sales math are visible',
      'Offer invitations and follow-up are scheduled',
      'The campaign has been evaluated before changing direction'
    ],
    resources: ['Sell Stage Intro', 'Make More Offers', 'Sales Debrief'],
    supportPrompt: 'Where is the sales process incomplete: invitation, follow-up, volume, belief, or conversion?'
  },
  {
    id: 'deliver',
    label: 'Deliver',
    memberQuestion: 'How will customers get results?',
    useWhen: 'Use this when sales are happening but onboarding, follow-through, proof, retention, or referrals need support.',
    milestone: 'Map the customer success path and improve the first meaningful win.',
    definitionOfDone: [
      'Customer first win is defined',
      'Onboarding and check-ins support that first win',
      'Proof, feedback, or retention evidence is being collected'
    ],
    resources: ['Customer Results Course', 'First-Win Onboarding', 'Proof and Retention'],
    supportPrompt: 'Where does a customer most need support between buying and getting the promised result?'
  },
  {
    id: 'leverage',
    label: 'Leverage',
    memberQuestion: 'How will this get easier to run?',
    useWhen: 'Use this when the revenue engine works but capacity, complexity, consistency, or owner-dependence blocks growth.',
    milestone: 'Simplify and document one proven workflow before automating or delegating it.',
    definitionOfDone: [
      'One operating constraint is named',
      'A working process has been simplified and documented',
      'Automation, AI, delegation, or removal was chosen for the right reason'
    ],
    resources: ['Leverage Stage Intro', 'Simplify What Works', 'AI or Delegation Decision'],
    supportPrompt: 'What is already proven enough to simplify, automate, delegate, or remove?'
  }
];

const MASTERMIND_RESOURCES: MastermindResource[] = [
  {
    id: 'start-here',
    title: 'Start Here',
    description: 'Set up the planner and learn the weekly planning loop.',
    access: 'Core',
    icon: Trophy,
    url: '/onboarding',
    isExternal: false,
  },
  {
    id: 'ask-faith',
    title: 'Ask Faith',
    description: 'Submit a coaching question with the context Faith needs to help.',
    access: 'Core',
    icon: HelpCircle,
    url: 'https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462',
    isExternal: true,
  },
  {
    id: 'coworking-room',
    title: 'Coworking Room',
    description: 'Join focused implementation time with other members.',
    access: 'Core',
    icon: Users,
    url: 'https://gobrunch.com/events/389643/589970',
    isExternal: true,
  },
  {
    id: 'recent-replays',
    title: 'Recent Call Replays',
    description: 'Catch current call recordings while they are in the active replay window.',
    access: '30-day replays',
    icon: Video,
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/learning?productId=8cd48d79-e6dd-4e11-9e4c-5d643703bad1',
    isExternal: true,
  },
  {
    id: 'replay-vault',
    title: 'Replay Vault',
    description: 'Use the full archive only when your membership level includes vault access.',
    access: 'Vault',
    icon: Archive,
    url: 'https://hub-3pwl3413w2.membership.io/',
    isExternal: true,
  },
  {
    id: 'events',
    title: 'Events',
    description: 'View upcoming mastermind calls, coworking, and live sessions.',
    access: 'Core',
    icon: Calendar,
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/events',
    isExternal: true,
  },
  {
    id: 'apply-events',
    title: 'Apply for Upcoming Events',
    description: 'Apply to attend eligible live events and experiences.',
    access: 'Eligible members',
    icon: Ticket,
    url: 'https://www.faithmariahevents.com/',
    isExternal: true,
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Connect with members, share wins, and get support.',
    access: 'Core',
    icon: MessageCircle,
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/home',
    isExternal: true,
  },
  {
    id: 'learning',
    title: 'Learning',
    description: 'Open the core curriculum and current assigned trainings.',
    access: 'Core',
    icon: GraduationCap,
    url: 'https://portal.faithmariah.com/communities/groups/mastermind/learning',
    isExternal: true,
  },
];

const STORAGE_KEY = 'mastermind-pinned-resources';
const TOTAL_TRANSCRIPT_WORDS = YOUTUBE_TEST_VIDEOS.reduce((sum, video) => sum + video.transcriptWordCount, 0);

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

export default function MastermindHub() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<StageId>('offer');

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

  const savePinned = (ids: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    setPinnedIds(ids);
  };

  const togglePin = (id: string) => {
    if (pinnedIds.includes(id)) {
      savePinned(pinnedIds.filter((p) => p !== id));
    } else if (pinnedIds.length < 3) {
      savePinned([...pinnedIds, id]);
    }
  };

  const selectedStage = ROADMAP_STAGES.find((stage) => stage.id === selectedStageId) ?? ROADMAP_STAGES[0];

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return MASTERMIND_RESOURCES;
    const query = searchQuery.toLowerCase();
    return MASTERMIND_RESOURCES.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.access.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const pinnedResources = useMemo(() => {
    return MASTERMIND_RESOURCES.filter((r) => pinnedIds.includes(r.id));
  }, [pinnedIds]);

  const unpinnedResources = useMemo(() => {
    return filteredResources.filter((r) => !pinnedIds.includes(r.id));
  }, [filteredResources, pinnedIds]);

  const filteredVideos = useMemo(() => {
    if (!videoSearchQuery.trim()) return YOUTUBE_TEST_VIDEOS;
    const query = videoSearchQuery.toLowerCase();
    return YOUTUBE_TEST_VIDEOS.filter((video) =>
      getVideoSearchValues(video).some((value) => value.toLowerCase().includes(query))
    );
  }, [videoSearchQuery]);

  const handleOpen = (resource: MastermindResource) => {
    if (resource.isExternal) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(resource.url);
    }
  };

  return (
    <Layout>
      <MastermindGate>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">Becoming Boss Mastermind</Badge>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">My Success Path</h1>
                <p className="text-muted-foreground">
                  One quarter. One result. One clear bottleneck to solve.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => navigate('/cycle-setup')}>
                <Target className="mr-2 h-4 w-4" />
                Build 90-Day Plan
              </Button>
              <Button variant="outline" onClick={() => navigate('/weekly-review')}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Review Progress
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <StatusCard
              icon={ListChecks}
              title="The result method"
              description="Plan, execute long enough to get evidence, evaluate without beating yourself up, then adjust."
            />
            <StatusCard
              icon={ShieldCheck}
              title="Access stays clean"
              description="Core curriculum is available to active members. Monthly members use current replays for 30 days; vault access stays separate."
            />
            <StatusCard
              icon={Bot}
              title="Faith AI is optional"
              description="AI supports the next move, coaching prep, and messy action. Members bring their own OpenAI or Claude key."
            />
          </div>

          <Tabs defaultValue="path" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:max-w-2xl sm:grid-cols-4">
              <TabsTrigger value="path">Success Path</TabsTrigger>
              <TabsTrigger value="videos">Video Search</TabsTrigger>
              <TabsTrigger value="support">Get Support</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="path" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDot className="h-5 w-5 text-primary" />
                    Find the first broken link
                  </CardTitle>
                  <CardDescription>
                    Pick the first area that blocks the 90-day result. Downstream tactics do not fix an upstream gap.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {ROADMAP_STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setSelectedStageId(stage.id)}
                        className={cn(
                          'rounded-lg border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-muted/40',
                          selectedStageId === stage.id && 'border-primary bg-primary/5 shadow-sm'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                              {stage.label}
                            </p>
                            <h3 className="font-semibold leading-snug">{stage.memberQuestion}</h3>
                          </div>
                          {selectedStageId === stage.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{stage.useWhen}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <Badge variant="outline" className="mb-2">{selectedStage.label} Path</Badge>
                        <CardTitle>{selectedStage.memberQuestion}</CardTitle>
                        <CardDescription>{selectedStage.milestone}</CardDescription>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/cycle-setup')}>
                        Add to Plan
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Definition of done</h3>
                      <div className="grid gap-2">
                        {selectedStage.definitionOfDone.map((item) => (
                          <div key={item} className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Active learning path</h3>
                      <div className="grid gap-2">
                        {selectedStage.resources.map((resource, index) => (
                          <div key={resource} className="flex items-center gap-3 rounded-md border p-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{resource}</p>
                              <p className="text-xs text-muted-foreground">
                                Required only when it supports the current milestone.
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Coaching prep
                    </CardTitle>
                    <CardDescription>
                      Bring the real bottleneck, evidence, and decision to coaching.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm font-medium">Ask this next:</p>
                      <p className="mt-2 text-sm text-muted-foreground">{selectedStage.supportPrompt}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        <span>Re-route only after real evidence, not one quiet week.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                        <span>Keep the active path to three resources when possible.</span>
                      </div>
                    </div>
                    <Button variant="secondary" className="w-full" onClick={() => window.open('https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462', '_blank', 'noopener,noreferrer')}>
                      Submit to Ask Faith
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    YouTube search test
                  </CardTitle>
                  <CardDescription>
                    Public Faith Mariah YouTube videos are indexed with pulled auto-captions so you can test transcript search before paying for private video hosting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <StatusPill title="Searches" value="Titles, summaries, topics, full pulled captions" />
                    <StatusPill title="Transcript source" value={`${TOTAL_TRANSCRIPT_WORDS.toLocaleString()} words from YouTube auto-captions`} />
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
            </TabsContent>

            <TabsContent value="support" className="grid gap-4 lg:grid-cols-3">
              <SupportCard
                icon={Bot}
                title="Enable Faith AI"
                description="Use your own OpenAI or Claude key. AI can help sort a brain dump, prep a coaching question, or break the next step down."
                buttonLabel="Open AI Settings"
                onClick={() => navigate('/ai-copywriting/settings')}
              />
              <SupportCard
                icon={Users}
                title="Use the room"
                description="When the next step is emotionally sticky, take it to coworking, community, or coaching instead of disappearing."
                buttonLabel="Open Community"
                onClick={() => window.open('https://portal.faithmariah.com/communities/groups/mastermind/home', '_blank', 'noopener,noreferrer')}
              />
              <SupportCard
                icon={Calendar}
                title="Return every week"
                description="The weekly review adjusts actions and support. The monthly review decides whether to continue, improve, reduce, or re-route."
                buttonLabel="Review Progress"
                onClick={() => navigate('/weekly-review')}
              />
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources or access level..."
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {pinnedResources.length > 0 && !searchQuery && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Pin className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Pinned</h2>
                    <Badge variant="secondary" className="text-xs">{pinnedResources.length}/3</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pinnedResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        isPinned
                        onTogglePin={() => togglePin(resource.id)}
                        onOpen={() => handleOpen(resource)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {!searchQuery && pinnedResources.length > 0 && (
                  <h2 className="text-sm font-semibold">All Resources</h2>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <div className="py-12 text-center">
                    <p className="text-muted-foreground">No resources found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MastermindGate>
    </Layout>
  );
}

interface StatusCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function StatusCard({ icon: Icon, title, description }: StatusCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
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

interface SupportCardProps extends StatusCardProps {
  buttonLabel: string;
  onClick: () => void;
}

function SupportCard({ icon: Icon, title, description, buttonLabel, onClick }: SupportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="secondary" className="w-full" onClick={onClick}>
          {buttonLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
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
  const Icon = resource.icon;

  return (
    <Card className={cn(
      'group transition-all duration-200 hover:shadow-md',
      isPinned && 'bg-primary/5 ring-2 ring-primary/20'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'rounded-lg p-2.5',
              isPinned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-1.5 text-base">
                {resource.title}
                {resource.isExternal && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                )}
              </CardTitle>
              <Badge variant="outline" className="mt-1 text-[11px]">{resource.access}</Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 shrink-0',
              isPinned ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100',
              !canPin && !isPinned && 'cursor-not-allowed'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (canPin || isPinned) onTogglePin();
            }}
            title={isPinned ? 'Unpin' : canPin ? 'Pin to top' : 'Max 3 pins allowed'}
          >
            <Star className={cn('h-4 w-4', isPinned && 'fill-current')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <CardDescription className="min-h-10 text-sm">
          {resource.description}
        </CardDescription>
        <Button
          onClick={onOpen}
          className="w-full"
          variant={isPinned ? 'default' : 'secondary'}
        >
          Open
          {resource.isExternal && <ExternalLink className="ml-2 h-3.5 w-3.5" />}
        </Button>
      </CardContent>
    </Card>
  );
}
