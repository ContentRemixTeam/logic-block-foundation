import { useState, useMemo, useEffect, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MastermindGate } from '@/components/membership/MastermindGate';
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

interface TestVideo {
  id: string;
  title: string;
  duration: string;
  stage: string;
  videoId: string;
  url: string;
  summary: string;
  transcriptPreview: string;
  keywords: string[];
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

const VIDEO_SEARCH_TERMS = ['sales page', 'email list', 'low capacity', 'AI', 'implementation', 'confidence'];

const YOUTUBE_TEST_VIDEOS: TestVideo[] = [
  {
    id: 'low-capacity-business-plan',
    title: 'How to Plan Your Business in a Low-Capacity Season (Without Burning Out)',
    duration: '18:11',
    stage: 'Leverage',
    videoId: 'TFake8oGWXQ',
    url: 'https://www.youtube.com/watch?v=TFake8oGWXQ',
    summary: 'Use this to test search around planning, capacity, burnout prevention, and making the next business move smaller.',
    transcriptPreview: 'Searchable test phrases: low capacity season, business planning, burnout, weekly plan, simple next step, energy, capacity, reduce overwhelm.',
    keywords: ['low capacity', 'burnout', 'planning', 'weekly plan', 'capacity', 'simplify'],
  },
  {
    id: 'annual-goals',
    title: 'Your Annual Goals Are Setting You Up to Fail - Do This Instead',
    duration: '6:10',
    stage: 'Offer',
    videoId: 'Wfp68hGGDic',
    url: 'https://www.youtube.com/watch?v=Wfp68hGGDic',
    summary: 'A planning reset for members who need a shorter goal cycle and a clearer 90-day result.',
    transcriptPreview: 'Searchable test phrases: annual goals, quarterly planning, 90-day goal, goal setting, focus, reset, result, business plan.',
    keywords: ['annual goals', '90-day plan', 'quarterly planning', 'focus', 'goals'],
  },
  {
    id: 'business-unstuck',
    title: 'How to get unstuck in business (coaching call replay)',
    duration: '1:16:45',
    stage: 'Offer',
    videoId: 'p7fwlN9aGnk',
    url: 'https://www.youtube.com/watch?v=p7fwlN9aGnk',
    summary: 'A coaching replay for diagnosing the stuck point before piling on more tactics.',
    transcriptPreview: 'Searchable test phrases: stuck in business, coaching replay, bottleneck, decision, offer clarity, visibility, action, next step.',
    keywords: ['stuck', 'coaching', 'bottleneck', 'offer clarity', 'decision'],
  },
  {
    id: 'bundle-email-list',
    title: 'How I Grew My Email List 10,000 Subscribers WITHOUT Running Ads (Bundle Strategy)',
    duration: '18:39',
    stage: 'Find',
    videoId: '3u19cOVnsAg',
    url: 'https://www.youtube.com/watch?v=3u19cOVnsAg',
    summary: 'A discovery and list-growth training for members who need more qualified people entering their world.',
    transcriptPreview: 'Searchable test phrases: email list, list growth, bundle strategy, no ads, subscribers, lead generation, collaboration, audience growth.',
    keywords: ['email list', 'bundle', 'no ads', 'lead generation', 'subscribers', 'audience growth'],
  },
  {
    id: 'offers-visibility-confidence',
    title: 'Online Business Coaching Replay: Offers, Visibility, and Confidence Blocks',
    duration: '1:07:01',
    stage: 'Sell',
    videoId: 'Bj4vRCmKH7Q',
    url: 'https://www.youtube.com/watch?v=Bj4vRCmKH7Q',
    summary: 'A replay for members whose sales problem is tangled with offer clarity, visibility, or confidence.',
    transcriptPreview: 'Searchable test phrases: offers, visibility, confidence blocks, online business coaching, selling, self trust, audience, marketing.',
    keywords: ['offers', 'visibility', 'confidence', 'sales', 'marketing', 'coaching'],
  },
  {
    id: 'free-sales-page',
    title: 'How to Make a Sales Page for Free (Step-by-Step Canva Tutorial)',
    duration: '19:49',
    stage: 'Sell',
    videoId: 'V5LWEgl70rw',
    url: 'https://www.youtube.com/watch?v=V5LWEgl70rw',
    summary: 'A practical sales page tutorial for turning an offer into a clear buying page without extra software spend.',
    transcriptPreview: 'Searchable test phrases: sales page, Canva tutorial, free sales page, offer copy, landing page, buy button, conversion.',
    keywords: ['sales page', 'Canva', 'landing page', 'offer copy', 'conversion'],
  },
  {
    id: 'business-without-hustle',
    title: 'Online Business Success Without the Hustle: How We Broke the Rules and Still Made Money',
    duration: '1:15:44',
    stage: 'Leverage',
    videoId: 'eVJJU2H3pl8',
    url: 'https://www.youtube.com/watch?v=eVJJU2H3pl8',
    summary: 'A low-burnout business conversation for members who need permission to simplify what actually works.',
    transcriptPreview: 'Searchable test phrases: online business success, without hustle, broke the rules, made money, sustainability, low pressure, capacity.',
    keywords: ['without hustle', 'made money', 'sustainable business', 'capacity', 'simplify'],
  },
  {
    id: 'motivation-business',
    title: "How to Stay Motivated in Business (When You'd Rather Set It on Fire)",
    duration: '9:28',
    stage: 'Nurture',
    videoId: 'KOuM_gqn7JU',
    url: 'https://www.youtube.com/watch?v=KOuM_gqn7JU',
    summary: 'A mindset and follow-through video for the messy middle of business implementation.',
    transcriptPreview: 'Searchable test phrases: motivation, stay motivated, business mindset, frustration, follow through, messy middle, keep going.',
    keywords: ['motivation', 'mindset', 'follow through', 'messy middle', 'frustration'],
  },
  {
    id: 'business-organization-tana',
    title: 'Stop Losing Ideas! My Simple System for 6-Figure Business Organization (Tana Tutorial)',
    duration: '20:28',
    stage: 'Leverage',
    videoId: 'nIICwqvCfrE',
    url: 'https://www.youtube.com/watch?v=nIICwqvCfrE',
    summary: 'A systems video for keeping ideas, tasks, and business context from scattering across tools.',
    transcriptPreview: 'Searchable test phrases: business organization, Tana tutorial, stop losing ideas, simple system, task capture, ideas, operations.',
    keywords: ['business organization', 'Tana', 'ideas', 'task capture', 'operations', 'systems'],
  },
  {
    id: 'implementation-gap',
    title: 'Implementation Gap',
    duration: '10:08',
    stage: 'Deliver',
    videoId: 'mzRA_eU9vtE',
    url: 'https://www.youtube.com/watch?v=mzRA_eU9vtE',
    summary: 'A short implementation-focused training for identifying why knowing is not becoming doing.',
    transcriptPreview: 'Searchable test phrases: implementation gap, taking action, execution, knowing versus doing, follow through, momentum, support.',
    keywords: ['implementation', 'execution', 'taking action', 'follow through', 'momentum'],
  },
  {
    id: 'ai-brand-strategy',
    title: 'How to Create a Complete Brand Strategy for FREE Using AI | Save $10K+ on Brand Development',
    duration: '17:16',
    stage: 'Leverage',
    videoId: 'LYhwpxReUes',
    url: 'https://www.youtube.com/watch?v=LYhwpxReUes',
    summary: 'A public AI training that lets us test search for AI implementation, brand strategy, and leverage topics.',
    transcriptPreview: 'Searchable test phrases: AI, brand strategy, free brand development, prompts, positioning, messaging, leverage, save money.',
    keywords: ['AI', 'brand strategy', 'prompts', 'positioning', 'messaging', 'leverage'],
  },
  {
    id: 'email-list-fast',
    title: 'How to Grow Your Email List FAST (without ads or social media)',
    duration: '22:13',
    stage: 'Find',
    videoId: '47o7iO6O9ag',
    url: 'https://www.youtube.com/watch?v=47o7iO6O9ag',
    summary: 'A list-growth training for finding subscribers without depending on paid ads or constant social posting.',
    transcriptPreview: 'Searchable test phrases: grow your email list fast, without ads, without social media, subscribers, list building, leads, audience.',
    keywords: ['email list', 'without ads', 'without social media', 'list building', 'leads'],
  },
];

const STORAGE_KEY = 'mastermind-pinned-resources';

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
      [
        video.title,
        video.duration,
        video.stage,
        video.summary,
        video.transcriptPreview,
        video.keywords.join(' '),
      ].some((value) => value.toLowerCase().includes(query))
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
                    Public Faith Mariah YouTube videos are indexed here so you can test the search flow before paying for private video hosting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <StatusPill title="Searches" value="Titles, summaries, topics, transcript previews" />
                    <StatusPill title="Future source" value="Bunny or GHL transcript text" />
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
                        {video.transcriptPreview}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
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
