import { lazy, Suspense, useState, useMemo, useEffect, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MastermindGate } from '@/components/membership/MastermindGate';
import { SuccessPathPlanCard } from '@/components/mastermind/SuccessPathPlanCard';
import { useMastermindSuccessPath } from '@/hooks/useMastermindSuccessPath';
import { MASTERMIND_SUCCESS_STAGES, type MastermindStageId } from '@/lib/mastermindSuccessPath';
import {
  Archive,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  ListChecks,
  MessageCircle,
  Pin,
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

const SHOW_VIDEO_SEARCH = import.meta.env.VITE_ENABLE_MASTERMIND_VIDEO_SEARCH === 'true';
const MastermindVideoSearch = SHOW_VIDEO_SEARCH
  ? lazy(() => import('@/components/mastermind/MastermindVideoSearch'))
  : null;

interface MastermindResource {
  id: string;
  title: string;
  description: string;
  access: string;
  icon: ComponentType<{ className?: string }>;
  url: string;
  isExternal: boolean;
}

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

export default function MastermindHub() {
  const navigate = useNavigate();
  const { data: successPathData, isLoading: successPathLoading } = useMastermindSuccessPath();
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<MastermindStageId>('offer');
  const [hasManuallySelectedStage, setHasManuallySelectedStage] = useState(false);

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

  useEffect(() => {
    const suggestedStageId = successPathData?.successPath?.stageId;
    if (suggestedStageId && !hasManuallySelectedStage) {
      setSelectedStageId(suggestedStageId);
    }
  }, [successPathData?.successPath?.stageId, hasManuallySelectedStage]);

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

  const selectedStage = MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === selectedStageId) ?? MASTERMIND_SUCCESS_STAGES[0];

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
            <TabsList
              className={cn(
                'grid w-full',
                SHOW_VIDEO_SEARCH ? 'grid-cols-2 sm:max-w-2xl sm:grid-cols-4' : 'grid-cols-3 sm:max-w-lg'
              )}
            >
              <TabsTrigger value="path">Success Path</TabsTrigger>
              {SHOW_VIDEO_SEARCH && <TabsTrigger value="videos">Video Search</TabsTrigger>}
              <TabsTrigger value="support">Get Support</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="path" className="space-y-4">
              <SuccessPathPlanCard
                cycle={successPathData?.cycle}
                successPath={successPathData?.successPath}
                isLoading={successPathLoading}
                onBuildPlan={() => navigate('/cycle-setup')}
                onUsePath={(stageId) => {
                  setSelectedStageId(stageId);
                  setHasManuallySelectedStage(true);
                }}
                onSubmitAskFaith={() => window.open('https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462', '_blank', 'noopener,noreferrer')}
                onEnableAi={() => navigate('/ai-copywriting/settings')}
              />

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
                    {MASTERMIND_SUCCESS_STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => {
                          setSelectedStageId(stage.id);
                          setHasManuallySelectedStage(true);
                        }}
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
                          <div key={resource.title} className="flex items-center gap-3 rounded-md border p-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{resource.title}</p>
                                <Badge variant="outline" className="text-[11px]">{resource.access}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {resource.useWhen}
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

            {SHOW_VIDEO_SEARCH && MastermindVideoSearch && (
              <TabsContent value="videos">
                <Suspense
                  fallback={
                    <Card>
                      <CardContent className="p-6 text-sm text-muted-foreground">
                        Loading video search...
                      </CardContent>
                    </Card>
                  }
                >
                  <MastermindVideoSearch />
                </Suspense>
              </TabsContent>
            )}

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
