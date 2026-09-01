import { useState, useMemo, useEffect, type ComponentType, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MastermindGate } from '@/components/membership/MastermindGate';
import { AiStudioPlanCard } from '@/components/mastermind/AiStudioPlanCard';
import { MastermindSupportBot } from '@/components/mastermind/MastermindSupportBot';
import { SuccessPathPlanCard } from '@/components/mastermind/SuccessPathPlanCard';
import { usePhaseOneCatalog } from '@/hooks/usePhaseOneCatalog';
import {
  MASTERMIND_PORTAL_RESOURCES,
  getProtectedTrainingHref,
  type MastermindPortalAccess,
  type MastermindPortalResource,
} from '@/data/mastermindPortalResources';
import { useMastermindSuccessPath } from '@/hooks/useMastermindSuccessPath';
import { useMembership } from '@/hooks/useMembership';
import {
  MASTERMIND_SUCCESS_STAGES,
  type MastermindStageId,
  type MastermindResourceRecommendation,
} from '@/lib/mastermindSuccessPath';
import {
  isDefaultMastermindPortalResource,
  isReadyMastermindCurriculumVideoResource,
  searchMastermindPortalResources,
} from '@/lib/mastermindPortalSearch';
import { getStorageItem, setStorageItem } from '@/lib/storage';
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  ExternalLink,
  Pin,
  Search,
  Sparkles,
  Star,
  Target,
  Users,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'mastermind-pinned-resources';
const TRAINING_TIME_STORAGE_KEY = 'mastermind-weekly-training-minutes';
const SHOW_AI_STUDIO = import.meta.env.VITE_ENABLE_MASTERMIND_AI_STUDIO === 'true';
const TRAINING_TIME_OPTIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
];

type ResourceFilterId = 'all' | 'focus' | 'core' | 'indexed';

function PreviewAccessBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function MastermindHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cycleId } = useParams<{ cycleId?: string }>();
  const { isMastermind, membershipTier } = useMembership();
  const {
    data: successPathData,
    isLoading: successPathLoading,
    isSaving: successPathSaving,
    error: successPathError,
    confirmStage,
    selectMilestone,
  } = useMastermindSuccessPath(cycleId);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [resourceFilter, setResourceFilter] = useState<ResourceFilterId>('all');
  const [activeTab, setActiveTab] = useState('guidance');
  const [trainingStageId, setTrainingStageId] = useState<MastermindStageId | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showWatchedResources, setShowWatchedResources] = useState(false);
  const [weeklyTrainingMinutes, setWeeklyTrainingMinutes] = useState(180);
  const isAdminPreview = location.pathname.startsWith('/admin/mastermind-90-day-plan-preview');
  const aiStudioEnabled = SHOW_AI_STUDIO || isAdminPreview;
  const AccessBoundary = isAdminPreview ? PreviewAccessBoundary : MastermindGate;
  const catalogQuery = usePhaseOneCatalog();
  const catalogRows = catalogQuery.data;
  const playableResourceIds = useMemo(
    () => new Set((catalogRows ?? []).map((row) => row.portal_resource_id)),
    [catalogRows]
  );
  const completedResourceIds = useMemo(
    () =>
      new Set(
        (catalogRows ?? [])
          .filter((row) => row.completed === true)
          .map((row) => row.portal_resource_id)
      ),
    [catalogRows]
  );

  useEffect(() => {
    const stored = getStorageItem(STORAGE_KEY);
    if (stored) {
      try {
        setPinnedIds(JSON.parse(stored));
      } catch {
        setPinnedIds([]);
      }
    }
  }, []);

  useEffect(() => {
    const stored = getStorageItem(TRAINING_TIME_STORAGE_KEY);
    const parsed = Number.parseInt(stored ?? '', 10);
    if (TRAINING_TIME_OPTIONS.some((option) => option.minutes === parsed)) {
      setWeeklyTrainingMinutes(parsed);
    }
  }, []);

  const savePinned = (ids: string[]) => {
    setStorageItem(STORAGE_KEY, JSON.stringify(ids));
    setPinnedIds(ids);
  };

  const updateWeeklyTrainingMinutes = (minutes: number) => {
    setStorageItem(TRAINING_TIME_STORAGE_KEY, String(minutes));
    setWeeklyTrainingMinutes(minutes);
  };

  const togglePin = (id: string) => {
    if (pinnedIds.includes(id)) {
      savePinned(pinnedIds.filter((p) => p !== id));
    } else if (pinnedIds.length < 3) {
      savePinned([...pinnedIds, id]);
    }
  };

  const selectedStageId = successPathData?.selectedStageId ?? 'offer';
  const selectedStage = MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === selectedStageId) ?? MASTERMIND_SUCCESS_STAGES[0];
  const activeTrainingStageId = trainingStageId ?? selectedStageId;
  const activeTrainingStage = MASTERMIND_SUCCESS_STAGES.find((stage) => stage.id === activeTrainingStageId) ?? selectedStage;
  const currentMilestoneId = successPathData?.snapshot?.current_milestone_id ?? selectedStage.milestones[0].id;
  const currentMilestone = selectedStage.milestones.find((milestone) => milestone.id === currentMilestoneId)
    ?? selectedStage.milestones[0];
  const currentCheckpointTitle = selectedStageId === 'offer'
    ? "Pick the thing you're going to sell this quarter"
    : currentMilestone.label;
  const currentCheckpointDescription = selectedStageId === 'offer' && currentMilestone.id === 'offer-focus'
    ? 'One offer. One group of people. One way money is supposed to come in.'
    : currentMilestone.output;
  const stageResourcesForCurrentMilestone = useMemo(() => {
    const milestoneResources = selectedStage.resources.filter((resource) =>
      !resource.milestoneIds || resource.milestoneIds.includes(currentMilestone.id)
    );

    const resources = milestoneResources.length > 0 ? milestoneResources : selectedStage.resources;
    return [...resources]
      .filter((resource) => resource.resourceId === 'faith-ai' || playableResourceIds.has(resource.resourceId))
      .sort((a, b) => {
        const completedA = completedResourceIds.has(a.resourceId) ? 1 : 0;
        const completedB = completedResourceIds.has(b.resourceId) ? 1 : 0;
        return completedA - completedB;
      });
  }, [completedResourceIds, currentMilestone.id, playableResourceIds, selectedStage]);

  const handleStageSelect = async (stageId: typeof selectedStageId) => {
    if (!successPathData?.cycle) {
      navigate('/cycle-setup');
      return;
    }

    try {
      await confirmStage(stageId);
    } catch {
      // The hook keeps the member on the current saved focus and exposes the error inline.
    }
  };

  const handleMilestoneSelect = async (milestoneId: string) => {
    try {
      await selectMilestone(milestoneId);
      setShowMilestones(false);
    } catch {
      // The hook preserves the previous saved milestone and exposes the error inline.
    }
  };

  const resourceFilters = useMemo(() => (
    [
      { id: 'all' as const, label: 'All' },
      { id: 'focus' as const, label: `${activeTrainingStage.label} focus` },
      { id: 'core' as const, label: 'Core' },
      { id: 'indexed' as const, label: 'Search-ready' },
    ]
  ), [activeTrainingStage.label]);

  const resourceSearchOptions = useMemo(() => {
    const accessByFilter: Partial<Record<ResourceFilterId, MastermindPortalAccess>> = {
      core: 'core',
    };

    return {
      stageId: resourceFilter === 'focus' ? activeTrainingStageId : undefined,
      access: accessByFilter[resourceFilter],
      transcriptReadyOnly: resourceFilter === 'indexed',
    };
  }, [activeTrainingStageId, resourceFilter]);

  const visibleResources = useMemo(() => {
    return MASTERMIND_PORTAL_RESOURCES.filter((resource) =>
      isReadyMastermindCurriculumVideoResource(resource) && playableResourceIds.has(resource.id)
    );
  }, [playableResourceIds]);

  const durationByResourceId = useMemo(() => {
    return new Map(
      (catalogRows ?? [])
        .filter((row) => typeof row.duration_seconds === 'number')
        .map((row) => [row.portal_resource_id, row.duration_seconds])
    );
  }, [catalogRows]);

  const indexedResourceCount = useMemo(() => {
    return visibleResources.filter((resource) =>
      resource.transcriptStatus === 'transcript_ready' || resource.transcriptStatus === 'description_indexed'
    ).length;
  }, [visibleResources]);

  const watchedVisibleResourceCount = useMemo(() => {
    return visibleResources.filter((resource) => completedResourceIds.has(resource.id)).length;
  }, [completedResourceIds, visibleResources]);

  const curriculumSectionStats = useMemo(() => (
    MASTERMIND_SUCCESS_STAGES.map((stage) => {
      const videos = visibleResources
        .filter((resource) => resource.stages.includes(stage.id))
        .sort((a, b) => {
          const completedA = completedResourceIds.has(a.id) ? 1 : 0;
          const completedB = completedResourceIds.has(b.id) ? 1 : 0;
          return completedA - completedB;
        });
      const watchedVideos = videos.filter((resource) => completedResourceIds.has(resource.id));
      const nextVideo = videos.find((resource) => !completedResourceIds.has(resource.id)) ?? null;

      return {
        stage,
        videos,
        watchedVideos,
        nextVideo,
      };
    })
  ), [completedResourceIds, visibleResources]);

  const weeklyWatchPlan = useMemo(() => {
    const resourcesById = new Map(visibleResources.map((resource) => [resource.id, resource]));
    const planOrderedResources = selectedStage.resources
      .map((resource) => resourcesById.get(resource.resourceId))
      .filter((resource): resource is MastermindPortalResource => Boolean(resource));
    const planResourceIds = new Set(planOrderedResources.map((resource) => resource.id));
    const fallbackResources = visibleResources.filter((resource) => !planResourceIds.has(resource.id));
    const candidates = [...planOrderedResources, ...fallbackResources]
      .filter((resource) => !completedResourceIds.has(resource.id));

    const targetSeconds = weeklyTrainingMinutes * 60;
    const selected: Array<{ resource: MastermindPortalResource; durationSeconds: number | null }> = [];
    let selectedSeconds = 0;

    for (const resource of candidates) {
      const durationSeconds = durationByResourceId.get(resource.id) ?? null;
      const estimatedSeconds = durationSeconds ?? 30 * 60;
      if (selectedSeconds + estimatedSeconds <= targetSeconds || selected.length === 0) {
        selected.push({ resource, durationSeconds });
        selectedSeconds += estimatedSeconds;
      }
      if (selectedSeconds >= targetSeconds) break;
    }

    return {
      resources: selected,
      selectedSeconds,
      targetSeconds,
    };
  }, [completedResourceIds, durationByResourceId, selectedStage.resources, visibleResources, weeklyTrainingMinutes]);

  const filteredResources = useMemo(() => {
    const resources = searchMastermindPortalResources(
      visibleResources,
      searchQuery,
      resourceSearchOptions
    );
    return [...resources].sort((a, b) => {
      const completedA = completedResourceIds.has(a.id) ? 1 : 0;
      const completedB = completedResourceIds.has(b.id) ? 1 : 0;
      return completedA - completedB;
    });
  }, [completedResourceIds, searchQuery, resourceSearchOptions, visibleResources]);

  const pinnedResources = useMemo(() => {
    return visibleResources
      .filter((r) => pinnedIds.includes(r.id) && (showWatchedResources || !completedResourceIds.has(r.id)))
      .sort((a, b) => {
        const completedA = completedResourceIds.has(a.id) ? 1 : 0;
        const completedB = completedResourceIds.has(b.id) ? 1 : 0;
        return completedA - completedB;
      });
  }, [completedResourceIds, pinnedIds, showWatchedResources, visibleResources]);

  const unpinnedResources = useMemo(() => {
    return filteredResources.filter((r) => !pinnedIds.includes(r.id));
  }, [filteredResources, pinnedIds]);

  const defaultUnwatchedResources = useMemo(() => {
    if (showWatchedResources) return unpinnedResources;
    return unpinnedResources.filter((resource) => !completedResourceIds.has(resource.id));
  }, [completedResourceIds, showWatchedResources, unpinnedResources]);

  const displayedResources = useMemo(() => {
    return searchQuery || resourceFilter !== 'all' ? filteredResources : defaultUnwatchedResources;
  }, [defaultUnwatchedResources, filteredResources, resourceFilter, searchQuery]);

  const hiddenWatchedResourceCount = useMemo(() => {
    if (showWatchedResources || searchQuery || resourceFilter !== 'all') return 0;
    return visibleResources.filter((resource) => completedResourceIds.has(resource.id)).length;
  }, [completedResourceIds, resourceFilter, searchQuery, showWatchedResources, visibleResources]);

  const handleOpen = (resource: MastermindPortalResource) => {
    const protectedHref = getProtectedTrainingHref(resource);
    if (protectedHref) {
      if (isAdminPreview && resource.protectedPlayback?.surface === 'curriculum') {
        const params = new URLSearchParams({ resource: resource.protectedPlayback.resourceId });
        navigate(`/admin/mastermind-training-preview?${params.toString()}`);
      } else {
        navigate(protectedHref);
      }
    } else if (resource.isExternal) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(resource.url);
    }
  };

  const handleOpenRecommendedResource = (recommendation: MastermindResourceRecommendation) => {
    const resource = MASTERMIND_PORTAL_RESOURCES.find((item) => item.id === recommendation.resourceId);
    if (!resource || !isDefaultMastermindPortalResource(resource)) return;
    if (resource.id !== 'faith-ai' && !playableResourceIds.has(resource.id)) {
      setTrainingStageId(selectedStageId);
      setResourceFilter('focus');
      setSearchQuery(resource.title);
      setActiveTab('training');
      return;
    }
    handleOpen(resource);
  };

  return (
    <Layout>
      <AccessBoundary>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">Becoming Boss Mastermind</Badge>
              <div>
                <h1 className="text-3xl font-bold">Your 90-Day Plan</h1>
                <p className="text-muted-foreground">
                  One goal, one weekly move, and the training that helps you make progress faster.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button variant="outline" onClick={() => navigate('/weekly-review')}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Weekly Check-In
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 sm:max-w-lg">
              <TabsTrigger value="guidance">Guidance</TabsTrigger>
              <TabsTrigger value="support">Get Support</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
            </TabsList>

            <TabsContent value="guidance" className="space-y-4">
              <SuccessPathPlanCard
                cycle={successPathData?.cycle}
                successPath={successPathData?.successPath}
                selectedStageId={selectedStageId}
                currentMilestoneId={currentMilestone.id}
                isLoading={successPathLoading}
                onBuildPlan={() => navigate('/cycle-setup')}
                onOpenResource={handleOpenRecommendedResource}
                onAddToPlan={() => {
                  const cycleId = successPathData?.cycle?.cycle_id;
                  navigate(cycleId ? `/cycle-setup?edit=${cycleId}` : '/cycle-setup');
                }}
                onAskFaith={() => window.open('https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462', '_blank', 'noopener,noreferrer')}
                onFindSupport={() => setActiveTab('training')}
                onOpenAiStudio={() => setActiveTab('support')}
                aiStudioEnabled={aiStudioEnabled}
              />

              {successPathData?.hasConfirmedStage && (
                <p className="text-sm text-muted-foreground">
                  <CheckCircle2 className="mr-1 inline h-4 w-4 text-primary" />
                  {selectedStage.label} is saved as your current 90-day focus.
                </p>
              )}

              {successPathError && (
                <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  Your previous focus is still safe. We could not save this change: {successPathError}
                </p>
              )}

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2 w-fit">Curriculum sections</Badge>
                      <CardTitle>Use the section that matches the current bottleneck.</CardTitle>
                      <CardDescription>
                        Each section points to one outcome, one quick win, and the videos that are ready to watch now.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="w-fit">{visibleResources.length} videos ready now</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {curriculumSectionStats.map(({ stage, videos, watchedVideos, nextVideo }) => {
                      const isSelected = selectedStageId === stage.id;
                      const watchedCount = watchedVideos.length;
                      const readyCount = videos.length;

                      return (
                        <div
                          key={stage.id}
                          className={cn(
                            'flex min-h-full flex-col rounded-lg border bg-background p-4 transition',
                            isSelected && 'border-primary bg-primary/5 shadow-sm'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">{stage.label}</p>
                                {isSelected && <Badge variant="secondary" className="text-[11px]">Current focus</Badge>}
                              </div>
                              <p className="mt-1 text-sm leading-snug text-muted-foreground">{stage.memberQuestion}</p>
                            </div>
                            <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          </div>

                          <div className="mt-4 space-y-3">
                            <div className="rounded-md bg-muted/45 p-3">
                              <p className="text-xs font-semibold text-muted-foreground">Outcome</p>
                              <p className="mt-1 text-sm leading-snug">{stage.milestone}</p>
                            </div>
                            <div className="rounded-md bg-muted/45 p-3">
                              <p className="text-xs font-semibold text-muted-foreground">Quick win</p>
                              <p className="mt-1 text-sm leading-snug">{stage.quickWin.action}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-[11px]">{readyCount} ready</Badge>
                              <Badge variant={watchedCount > 0 ? 'success' : 'outline'} className="text-[11px]">{watchedCount} watched</Badge>
                            </div>
                            {nextVideo ? (
                              <p className="text-xs leading-snug text-muted-foreground">
                                Next useful video: <span className="font-medium text-foreground">{nextVideo.title}</span>
                              </p>
                            ) : readyCount > 0 ? (
                              <p className="text-xs leading-snug text-muted-foreground">
                                Section complete. Use the next section or ask Faith what needs pressure-tested next.
                              </p>
                            ) : (
                              <p className="text-xs leading-snug text-muted-foreground">
                                No videos are ready in this section yet.
                              </p>
                            )}
                          </div>

                          <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
                            <Button
                              type="button"
                              variant={isSelected ? 'secondary' : 'outline'}
                              className="min-h-10 flex-1"
                              disabled={successPathSaving}
                              onClick={() => void handleStageSelect(stage.id)}
                            >
                              {isSelected ? 'Saved focus' : 'Use this focus'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="min-h-10 flex-1"
                              onClick={() => {
                                setTrainingStageId(stage.id);
                                setResourceFilter('focus');
                                setSearchQuery('');
                                setActiveTab('training');
                              }}
                            >
                              Show videos
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Badge variant="outline" className="w-fit">Start here</Badge>
                  <CardTitle>{currentCheckpointTitle}</CardTitle>
                  <CardDescription>{currentCheckpointDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" onClick={() => setShowMilestones((open) => !open)}>
                    {showMilestones ? 'Keep this focus' : 'Change focus'}
                  </Button>

                  {showMilestones && (
                    <div className="grid gap-2">
                      {selectedStage.milestones.map((milestone, index) => (
                        <button
                          key={milestone.id}
                          type="button"
                          disabled={successPathSaving}
                          onClick={() => void handleMilestoneSelect(milestone.id)}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40',
                            milestone.id === currentMilestone.id && 'border-primary bg-primary/5',
                            successPathSaving && 'cursor-wait opacity-70'
                          )}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {index + 1}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold">{milestone.label}</span>
                            <span className="block text-xs text-muted-foreground">{milestone.output}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change this if it is not the right focus.</CardTitle>
                  <CardDescription>
                    Choose the area that needs attention first. Your choice is saved to this 90-day cycle and stays here when you return.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {MASTERMIND_SUCCESS_STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        disabled={successPathSaving}
                        onClick={() => void handleStageSelect(stage.id)}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-muted/40',
                          selectedStageId === stage.id && 'border-primary bg-primary/5 shadow-sm',
                          successPathSaving && 'cursor-wait opacity-70'
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold">{stage.label}</p>
                          <p className="text-xs text-muted-foreground">{stage.memberQuestion}</p>
                        </div>
                        {selectedStageId === stage.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <Card>
                  <CardHeader>
                    <Badge variant="outline" className="mb-2 w-fit">{selectedStage.label} support</Badge>
                    <CardTitle>Watch only what helps the next move.</CardTitle>
                    <CardDescription>
                      Start with one resource. The plan is the work, and the curriculum supports it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {stageResourcesForCurrentMilestone.map((resource, index) => (
                        <div key={resource.title} className="rounded-lg border p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium leading-snug">{resource.title}</p>
                                <Badge variant="outline" className="text-[11px]">{resource.access}</Badge>
                                {completedResourceIds.has(resource.resourceId) && (
                                  <Badge variant="success" className="text-[11px]">Watched</Badge>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{resource.useWhen}</p>
                              {resource.afterWatching && (
                                <p className="mt-2 text-sm leading-snug">
                                  <span className="font-semibold">After watching: </span>{resource.afterWatching}
                                </p>
                              )}
                              <Button
                                variant="link"
                                className="mt-2 h-auto p-0"
                                onClick={() => handleOpenRecommendedResource(resource)}
                              >
                                {completedResourceIds.has(resource.resourceId) ? 'Watch again' : 'Open resource'}
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Get unstuck
                    </CardTitle>
                    <CardDescription>
                      Bring the real thing you tried and what happened. That gives Faith enough evidence to coach the next decision.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bring this question</p>
                      <p className="mt-2 text-sm">{selectedStage.supportPrompt}</p>
                    </div>
                    <Button className="w-full" onClick={() => window.open('https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462', '_blank', 'noopener,noreferrer')}>
                      Ask Faith
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="support" className="space-y-4">
              <MastermindSupportBot
                cycle={successPathData?.cycle}
                selectedStageId={selectedStageId}
                currentMilestone={currentMilestone}
                visibleResources={visibleResources}
                completedResourceIds={completedResourceIds}
                onOpenResource={handleOpen}
                onOpenAiSettings={() => navigate('/ai-copywriting/settings')}
              />

              {aiStudioEnabled && (
                <AiStudioPlanCard
                  cycle={successPathData?.cycle}
                  selectedStageId={selectedStageId}
                  isMastermind={isMastermind}
                  membershipTier={membershipTier}
                  onOpenAiSettings={() => navigate('/ai-copywriting/settings')}
                />
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                <SupportCard
                  icon={Bot}
                  title="Ask Faith"
                  description="When the bot or playlist shows a decision point, send Faith the context and the evidence you have so far."
                  buttonLabel="Submit Question"
                  onClick={() => window.open('https://airtable.com/appP01GhbZAtwT4nN/shrIRdOHFXijc8462', '_blank', 'noopener,noreferrer')}
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
              </div>
            </TabsContent>

            <TabsContent value="training" className="space-y-4">
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <Badge variant="secondary" className="mb-2 w-fit">Training Library</Badge>
                      <CardTitle>Watch the videos that are ready inside this app.</CardTitle>
                      <CardDescription>
                        Choose the smallest useful next resource. Current replays, Vault search, AI tools, and support links stay in their own sections until each path is verified.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {filteredResources.length === visibleResources.length
                        ? `${visibleResources.length} ready videos`
                        : `${filteredResources.length} matching videos`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <AuditMetric title="Plan stages" value={MASTERMIND_SUCCESS_STAGES.length.toLocaleString()} />
                  <AuditMetric title="Videos ready" value={visibleResources.length.toLocaleString()} />
                  <AuditMetric title="Watched" value={watchedVisibleResourceCount.toLocaleString()} />
                  <AuditMetric title="Search-ready" value={indexedResourceCount.toLocaleString()} />
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2 w-fit">This week's playlist</Badge>
                      <CardTitle>Fit training into the time you actually have.</CardTitle>
                      <CardDescription>
                        Choose a weekly watch budget and this page will prioritize unwatched videos from your current 90-day focus first.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {formatWeeklyWatchPlanSummary(
                        weeklyWatchPlan.resources.length,
                        weeklyWatchPlan.selectedSeconds,
                        weeklyWatchPlan.targetSeconds
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {TRAINING_TIME_OPTIONS.map((option) => (
                      <Button
                        key={option.minutes}
                        type="button"
                        variant={weeklyTrainingMinutes === option.minutes ? 'default' : 'outline'}
                        size="sm"
                        className="min-h-9"
                        onClick={() => updateWeeklyTrainingMinutes(option.minutes)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>

                  {weeklyWatchPlan.resources.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-3">
                      {weeklyWatchPlan.resources.map(({ resource, durationSeconds }, index) => (
                        <button
                          key={resource.id}
                          type="button"
                          onClick={() => handleOpen(resource)}
                          className="flex h-full flex-col rounded-lg border bg-background p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Badge variant={index === 0 ? 'secondary' : 'outline'} className="mb-2 text-[11px]">
                                {index === 0 ? 'Watch first' : `Video ${index + 1}`}
                              </Badge>
                              <h3 className="break-words text-sm font-semibold leading-snug">{resource.title}</h3>
                            </div>
                            <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{resource.memberJob}</p>
                          <div className="mt-auto flex flex-wrap gap-2 pt-4">
                            <Badge variant="outline" className="text-[11px]">{formatWatchDuration(durationSeconds)}</Badge>
                            <Badge variant="outline" className="text-[11px]">{resource.stages[0]}</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/35 p-4">
                      <p className="text-sm font-medium">Everything ready is watched.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Use the section browser below to rewatch a lesson, or ask Faith what deserves pressure-testing next.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {!searchQuery && resourceFilter === 'all' && (
                <Card>
                  <CardHeader>
                    <Badge variant="outline" className="mb-2 w-fit">Training by focus area</Badge>
                    <CardTitle>Pick the section that matches the job your plan is doing.</CardTitle>
                    <CardDescription>
                      Browse by section without changing the saved focus on your 90-day plan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 lg:grid-cols-2">
                    {curriculumSectionStats.map(({ stage, videos, watchedVideos, nextVideo }) => (
                      <div key={stage.id} className="rounded-lg border bg-background p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold">{stage.label}</h2>
                              {selectedStageId === stage.id && <Badge variant="secondary" className="text-[11px]">Your focus</Badge>}
                            </div>
                            <p className="mt-1 text-sm leading-snug text-muted-foreground">{stage.useWhen}</p>
                          </div>
                          <Badge variant="outline" className="w-fit text-[11px]">
                            {watchedVideos.length}/{videos.length} watched
                          </Badge>
                        </div>

                        <div className="mt-3 rounded-md bg-muted/45 p-3">
                          <p className="text-xs font-semibold text-muted-foreground">Outcome</p>
                          <p className="mt-1 text-sm leading-snug">{stage.milestone}</p>
                        </div>

                        <div className="mt-3 space-y-2">
                          {videos.slice(0, 4).map((resource) => {
                            const isCompleted = completedResourceIds.has(resource.id);
                            return (
                              <button
                                key={resource.id}
                                type="button"
                                onClick={() => handleOpen(resource)}
                                className={cn(
                                  'flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40',
                                  isCompleted && 'bg-muted/35'
                                )}
                              >
                                <span className="min-w-0">
                                  <span className={cn('block text-sm font-medium leading-snug', isCompleted && 'text-muted-foreground')}>
                                    {resource.title}
                                  </span>
                                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                                    {resource.description}
                                  </span>
                                </span>
                                <Badge variant={isCompleted ? 'success' : 'secondary'} className="shrink-0 text-[11px]">
                                  {isCompleted ? 'Watched' : 'Watch'}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-10 flex-1"
                            disabled={!nextVideo}
                            onClick={() => nextVideo && handleOpen(nextVideo)}
                          >
                            {nextVideo ? 'Watch next' : 'Section complete'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-10 flex-1"
                            onClick={() => {
                              setTrainingStageId(stage.id);
                              setResourceFilter('focus');
                              setSearchQuery('');
                            }}
                          >
                            View section
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Search className="h-4 w-4 text-primary" />
                    Find a training
                  </CardTitle>
                  <CardDescription>
                    This finder only shows curriculum videos that open in the in-app player. Replays, Vault search, AI tools, and support links stay separate so every choice has one job.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search offer, sales page, email list, onboarding, systems..."
                      className="pl-10 pr-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear resource search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {resourceFilters.map((filter) => (
                      <Button
                        key={filter.id}
                        type="button"
                        variant={resourceFilter === filter.id ? 'default' : 'outline'}
                        size="sm"
                        className="min-h-9 whitespace-normal text-left leading-tight"
                        onClick={() => setResourceFilter(filter.id)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                    {watchedVisibleResourceCount > 0 && (
                      <Button
                        type="button"
                        variant={showWatchedResources ? 'secondary' : 'outline'}
                        size="sm"
                        className="min-h-9 whitespace-normal text-left leading-tight"
                        onClick={() => setShowWatchedResources((visible) => !visible)}
                      >
                        {showWatchedResources ? 'Hide watched' : `Show watched (${watchedVisibleResourceCount})`}
                      </Button>
                    )}
                  </div>

                  {watchedVisibleResourceCount > 0 && !showWatchedResources && !searchQuery && resourceFilter === 'all' && (
                    <p className="text-sm text-muted-foreground">
                      Watched videos are hidden from the default list and still available through search or section filters.
                    </p>
                  )}
                </CardContent>
              </Card>

              {pinnedResources.length > 0 && !searchQuery && resourceFilter === 'all' && (
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
                        isCompleted={completedResourceIds.has(resource.id)}
                        onTogglePin={() => togglePin(resource.id)}
                        onOpen={() => handleOpen(resource)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {!searchQuery && resourceFilter === 'all' && pinnedResources.length > 0 && (
                  <h2 className="text-sm font-semibold">All Resources</h2>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      isPinned={pinnedIds.includes(resource.id)}
                      isCompleted={completedResourceIds.has(resource.id)}
                      canPin={pinnedIds.length < 3}
                      onTogglePin={() => togglePin(resource.id)}
                      onOpen={() => handleOpen(resource)}
                    />
                  ))}
                </div>

                {filteredResources.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="break-words text-muted-foreground">
                      {searchQuery
                        ? `No ready trainings match "${searchQuery}"`
                        : 'No ready trainings match this filter yet.'}
                    </p>
                  </div>
                )}

                {filteredResources.length > 0 && displayedResources.length === 0 && hiddenWatchedResourceCount > 0 && (
                  <div className="rounded-lg border bg-muted/35 p-6 text-center">
                    <p className="text-sm font-medium">All ready trainings are watched.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use Show watched to rewatch, or choose another focus area if your plan has changed.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </AccessBoundary>
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

interface AuditMetricProps {
  title: string;
  value: string;
}

function AuditMetric({ title, value }: AuditMetricProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}

function formatWatchDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return 'About 30 min';
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

function formatWeeklyWatchPlanSummary(videoCount: number, selectedSeconds: number, targetSeconds: number) {
  if (videoCount <= 0) return `0 selected - ${formatWatchDuration(targetSeconds)} budget`;
  const videoLabel = videoCount === 1 ? '1 video selected' : `${videoCount} videos selected`;
  const selectedLabel = formatWatchDuration(selectedSeconds);
  if (selectedSeconds <= targetSeconds) {
    return `${videoLabel} - ${selectedLabel} within ${formatWatchDuration(targetSeconds)} budget`;
  }
  return `${videoLabel} - ${selectedLabel} best next watch`;
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
  resource: MastermindPortalResource;
  isPinned: boolean;
  isCompleted: boolean;
  canPin?: boolean;
  onTogglePin: () => void;
  onOpen: () => void;
}

function ResourceCard({ resource, isPinned, isCompleted, canPin = true, onTogglePin, onOpen }: ResourceCardProps) {
  const Icon = resource.icon;

  return (
    <Card className={cn(
      'group flex h-full flex-col transition-all duration-200 hover:shadow-md',
      isPinned && 'bg-primary/5 ring-2 ring-primary/20'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn(
              'shrink-0 rounded-lg p-2.5',
              isPinned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="flex min-w-0 items-center gap-1.5 text-base">
                <span className="min-w-0 flex-1 break-words leading-snug">{resource.title}</span>
                {resource.isExternal && (
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
              </CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant={getAccessBadgeVariant(resource.access)} className="text-[11px]">
                  {resource.accessLabel}
                </Badge>
                {isCompleted && (
                  <Badge variant="success" className="text-[11px]">Watched</Badge>
                )}
                <Badge variant="outline" className="text-[11px]">
                  {formatResourceType(resource.type)}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 shrink-0',
              isPinned ? 'text-primary' : 'text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
              !canPin && !isPinned && 'cursor-not-allowed'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (canPin || isPinned) onTogglePin();
            }}
            title={isPinned ? 'Unpin' : canPin ? 'Pin to top' : 'Max 3 pins allowed'}
            aria-label={isPinned ? `Unpin ${resource.title}` : canPin ? `Pin ${resource.title}` : 'Maximum pinned resources reached'}
          >
            <Star className={cn('h-4 w-4', isPinned && 'fill-current')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-4 pt-0">
        <CardDescription className="text-sm">
          {resource.description}
        </CardDescription>

        <div className="rounded-md bg-muted/45 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Best for</p>
          <p className="mt-1 text-sm leading-snug">{resource.memberJob}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant={getTranscriptBadgeVariant(resource.transcriptStatus)} className="text-[11px]">
            {resource.transcriptLabel}
          </Badge>
          {resource.stages.slice(0, 3).map((stageId) => (
            <Badge key={stageId} variant="outline" className="text-[11px] capitalize">
              {stageId}
            </Badge>
          ))}
          {resource.stages.length > 3 && (
            <Badge variant="outline" className="text-[11px]">
              +{resource.stages.length - 3}
            </Badge>
          )}
        </div>

        <div className="mt-auto space-y-3">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">Portal path</p>
            <p className="mt-1 break-words text-xs leading-snug">{resource.portalPath}</p>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">{resource.sourceStatus}</p>
          <Button
            onClick={onOpen}
            className="w-full"
            variant={isPinned ? 'default' : 'secondary'}
          >
            {isCompleted ? 'Watch Again' : resource.primaryAction}
            {resource.isExternal && <ExternalLink className="ml-2 h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getAccessBadgeVariant(access: MastermindPortalAccess) {
  if (access === 'core') return 'secondary';
  if (access === 'current_replay') return 'pink';
  if (access === 'vault') return 'warning';
  if (access === 'access_review') return 'outline';
  return 'outline';
}

function getTranscriptBadgeVariant(status: MastermindPortalResource['transcriptStatus']) {
  if (status === 'transcript_ready') return 'success';
  if (status === 'description_indexed') return 'pink';
  if (status === 'server_side_required') return 'warning';
  return 'outline';
}

function formatResourceType(type: MastermindPortalResource['type']) {
  return type.replace('_', ' ');
}
