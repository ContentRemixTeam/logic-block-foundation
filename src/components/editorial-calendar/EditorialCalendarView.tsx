import { useState, useCallback } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, ChevronRight, Calendar, Plus, Rocket, 
  Inbox, LayoutGrid, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEditorialCalendar } from '@/hooks/useEditorialCalendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { CalendarDensityProvider, useCalendarDensity, CalendarDensity } from '@/hooks/useCalendarDensity';
import { CalendarItem } from '@/lib/calendarConstants';
import { CalendarWeekView } from './CalendarWeekView';
import { UnscheduledPool } from './UnscheduledPool';
import { PlatformFilterBar } from './PlatformFilterBar';
import { ViewToggle } from './ViewToggle';
import { ContentQuickEditDrawer } from './ContentQuickEditDrawer';
import { CalendarContentCard, CalendarContentCardOverlay } from './CalendarContentCard';
import { CalendarOnboarding, useCalendarOnboardingSeen } from './CalendarOnboarding';
import { AddContentDialog } from './AddContentDialog';
import { PlatformConfigModal } from './PlatformConfigModal';
import { CampaignSlideIn } from './CampaignSlideIn';
import { CalendarStats } from './CalendarStats';
import { toast } from 'sonner';

const DENSITY_LABELS: Record<CalendarDensity, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
};

export function EditorialCalendarView() {
  return (
    <CalendarDensityProvider>
      <EditorialCalendarViewInner />
    </CalendarDensityProvider>
  );
}

function EditorialCalendarViewInner() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState<'publish' | 'create'>('publish');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Campaign states
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  
  // Modal states
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [platformConfigOpen, setPlatformConfigOpen] = useState(false);
  
  // New responsive states
  const [mobilePoolOpen, setMobilePoolOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(true);
  
  const hasSeenOnboarding = useCalendarOnboardingSeen();
  const isMobile = useIsMobile();
  const { density, setDensity } = useCalendarDensity();

  const { 
    items, 
    unscheduledItems,
    campaigns,
    getItemsForDay, 
    updateItemDateAsync,
    isUpdating,
    isLoading,
    weekStartDate,
    weekEndDate,
  } = useEditorialCalendar({ weekStart, campaignFilter });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Navigation handlers
  const goToPreviousWeek = () => setWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Platform filter handlers
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Campaign handlers
  const handleCampaignClick = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
  };

  const handleFilterToCampaign = (campaignId: string) => {
    setCampaignFilter(campaignId);
  };

  // Item click handler
  const handleItemClick = (item: CalendarItem) => {
    setEditingItem(item);
    setEditDrawerOpen(true);
    if (isMobile) setMobilePoolOpen(false);
  };

  // Save handler for quick edit
  const handleSaveEdit = useCallback(async (updates: { creationDate: string | null; publishDate: string | null }) => {
    if (!editingItem) return;

    setIsSaving(true);
    let hasError = false;

    try {
      if (updates.creationDate !== editingItem.creationDate) {
        await updateItemDateAsync({ item: editingItem, lane: 'create', newDate: updates.creationDate });
      }

      if (updates.publishDate !== editingItem.publishDate) {
        await updateItemDateAsync({ item: editingItem, lane: 'publish', newDate: updates.publishDate });
      }

      toast.success('Content schedule updated');
      setEditDrawerOpen(false);
    } catch (error) {
      console.error('Failed to save calendar item:', error);
      toast.error('Failed to save changes. Please try again.');
      hasError = true;
    } finally {
      setIsSaving(false);
    }

    return !hasError;
  }, [editingItem, updateItemDateAsync]);

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = active.data.current?.item as CalendarItem | undefined;
    if (item) {
      setActiveItem(item);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const item = active.data.current?.item as CalendarItem | undefined;
    if (!item) return;

    const overId = String(over.id);

    if (overId === 'unscheduled') {
      try {
        await Promise.all([
          updateItemDateAsync({ item, lane: 'create', newDate: null }),
          updateItemDateAsync({ item, lane: 'publish', newDate: null }),
        ]);
        toast.success('Content moved to unscheduled');
      } catch (error) {
        console.error('Failed to unschedule content:', error);
        toast.error('Failed to unschedule content. Please try again.');
      }
      return;
    }

    const match = overId.match(/^(create|publish)-(\d{4}-\d{2}-\d{2})$/);
    if (match) {
      const [, lane, dateStr] = match;
      try {
        await updateItemDateAsync({ 
          item, 
          lane: lane as 'create' | 'publish', 
          newDate: dateStr 
        });
        toast.success(`Scheduled for ${lane === 'create' ? 'creation' : 'publishing'} on ${format(new Date(dateStr), 'MMM d')}`);
      } catch (error) {
        console.error('Failed to schedule content:', error);
        toast.error('Failed to schedule content. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Onboarding Banner */}
      {showOnboarding && !hasSeenOnboarding && (
        <CalendarOnboarding onDismiss={() => setShowOnboarding(false)} />
      )}

      {/* Header */}
      <div className="bg-card border-b border-border">
        {/* Main navigation row */}
        <div className="flex items-center justify-between gap-4 px-4 py-4 flex-wrap">
          {/* Week Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              <Button variant="ghost" size="icon" onClick={goToPreviousWeek} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 gap-1.5 px-3">
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Today</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextWeek} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Week range */}
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">
                {format(weekStartDate, 'MMM d')} – {format(weekEndDate, 'MMM d')}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {format(weekStartDate, 'yyyy')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Campaign Filter */}
            {campaigns.length > 0 && !isMobile && (
              <Select
                value={campaignFilter || 'all'}
                onValueChange={(value) => setCampaignFilter(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="All Campaigns" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectSeparator />
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: campaign.display_color }}
                        />
                        <span className="truncate">{campaign.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Density Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 hidden md:flex">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{DENSITY_LABELS[density]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDensity('compact')}>
                  <div className="flex flex-col">
                    <span className="font-medium">Compact</span>
                    <span className="text-xs text-muted-foreground">See more at once</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDensity('comfortable')}>
                  <div className="flex flex-col">
                    <span className="font-medium">Comfortable</span>
                    <span className="text-xs text-muted-foreground">Balanced view (default)</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDensity('spacious')}>
                  <div className="flex flex-col">
                    <span className="font-medium">Spacious</span>
                    <span className="text-xs text-muted-foreground">More details visible</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setAddContentOpen(true)} size="sm" className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Content</span>
            </Button>
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>

        {/* Stats Bar - Collapsible */}
        {statsVisible ? (
          <div className="px-4 py-2 border-t border-border/50 bg-muted/10">
            <div className="flex items-center justify-between">
              <CalendarStats items={items} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatsVisible(false)}
                className="h-6 px-2"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-1 border-t border-border/50 bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatsVisible(true)}
              className="h-6 w-full justify-between text-xs text-muted-foreground"
            >
              Show Stats
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Platform Filter Bar */}
        <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
          <PlatformFilterBar
            selectedPlatforms={selectedPlatforms}
            onTogglePlatform={togglePlatform}
            onConfigureClick={() => setPlatformConfigOpen(true)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Week Grid */}
          <CalendarWeekView
            weekStart={weekStart}
            campaigns={campaigns}
            getItemsForDay={getItemsForDay}
            onItemClick={handleItemClick}
            onCampaignClick={handleCampaignClick}
            view={view}
            selectedPlatforms={selectedPlatforms}
          />

          {/* Desktop: Sidebar Pool */}
          {!isMobile && (
            <div className="shrink-0">
              <UnscheduledPool
                items={unscheduledItems}
                onItemClick={handleItemClick}
                selectedPlatforms={selectedPlatforms}
                onAddContentClick={() => setAddContentOpen(true)}
              />
            </div>
          )}
        </div>

        {/* Mobile: Floating Action Button + Bottom Sheet */}
        {isMobile && (
          <Sheet open={mobilePoolOpen} onOpenChange={setMobilePoolOpen}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
              >
                <Inbox className="h-6 w-6" />
                {unscheduledItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                    {unscheduledItems.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Unscheduled Content
                  <span className="text-sm text-muted-foreground font-normal">
                    ({unscheduledItems.length})
                  </span>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(80vh-60px)]">
                <div className="p-4 space-y-2">
                  {unscheduledItems.map(item => (
                    <CalendarContentCard
                      key={`${item.id}:mobile-pool`}
                      item={item}
                      laneContext="pool"
                      onClick={() => handleItemClick(item)}
                    />
                  ))}
                  {unscheduledItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>All content is scheduled!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && <CalendarContentCardOverlay item={activeItem} />}
        </DragOverlay>
      </DndContext>

      {/* Quick Edit Drawer */}
      <ContentQuickEditDrawer
        item={editingItem}
        open={editDrawerOpen}
        onOpenChange={(open) => {
          if (!isSaving) {
            setEditDrawerOpen(open);
          }
        }}
        onSave={handleSaveEdit}
        isSaving={isSaving}
      />

      {/* Add Content Dialog */}
      <AddContentDialog
        open={addContentOpen}
        onOpenChange={setAddContentOpen}
      />

      {/* Platform Config Modal */}
      <PlatformConfigModal
        open={platformConfigOpen}
        onOpenChange={setPlatformConfigOpen}
      />

      {/* Campaign Slide-In Panel */}
      <CampaignSlideIn
        campaignId={selectedCampaignId}
        open={!!selectedCampaignId}
        onOpenChange={(open) => {
          if (!open) setSelectedCampaignId(null);
        }}
        onFilterToCampaign={handleFilterToCampaign}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
}
