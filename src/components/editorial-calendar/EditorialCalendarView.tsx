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
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorialCalendar } from '@/hooks/useEditorialCalendar';
import { CalendarItem } from '@/lib/calendarConstants';
import { CalendarWeekView } from './CalendarWeekView';
import { UnscheduledPool } from './UnscheduledPool';
import { PlatformFilterBar } from './PlatformFilterBar';
import { ViewToggle } from './ViewToggle';
import { ContentQuickEditDrawer } from './ContentQuickEditDrawer';
import { CalendarContentCardOverlay } from './CalendarContentCard';
import { toast } from 'sonner';

export function EditorialCalendarView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [view, setView] = useState<'publish' | 'create'>('publish');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { 
    items, 
    unscheduledItems, 
    getItemsForDay, 
    updateItemDateAsync,
    isUpdating,
    isLoading,
    weekStartDate,
    weekEndDate,
  } = useEditorialCalendar({ weekStart });

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

  // Item click handler
  const handleItemClick = (item: CalendarItem) => {
    setEditingItem(item);
    setEditDrawerOpen(true);
  };

  // Save handler for quick edit - AWAIT saves and handle errors
  const handleSaveEdit = useCallback(async (updates: { creationDate: string | null; publishDate: string | null }) => {
    if (!editingItem) return;

    setIsSaving(true);
    let hasError = false;

    try {
      // Update creation date if changed
      if (updates.creationDate !== editingItem.creationDate) {
        await updateItemDateAsync({ item: editingItem, lane: 'create', newDate: updates.creationDate });
      }

      // Update publish date if changed
      if (updates.publishDate !== editingItem.publishDate) {
        await updateItemDateAsync({ item: editingItem, lane: 'publish', newDate: updates.publishDate });
      }

      toast.success('Content schedule updated');
      setEditDrawerOpen(false);
    } catch (error) {
      console.error('Failed to save calendar item:', error);
      toast.error('Failed to save changes. Please try again.');
      hasError = true;
      // Keep drawer open on error so user can retry
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

    // Dropped on unscheduled pool
    if (overId === 'unscheduled') {
      try {
        // Clear both dates - await to ensure saves complete
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

    // Dropped on a day lane (format: "create-2024-01-15" or "publish-2024-01-15")
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border flex-wrap">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="gap-2">
            <Calendar className="h-4 w-4" />
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            {format(weekStartDate, 'MMM d')} - {format(weekEndDate, 'MMM d, yyyy')}
          </span>
        </div>

        {/* View Toggle */}
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Platform Filter Bar */}
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <PlatformFilterBar
          selectedPlatforms={selectedPlatforms}
          onTogglePlatform={togglePlatform}
        />
      </div>

      {/* Main Content Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Week Grid */}
          <CalendarWeekView
            weekStart={weekStart}
            getItemsForDay={getItemsForDay}
            onItemClick={handleItemClick}
            view={view}
            selectedPlatforms={selectedPlatforms}
          />

          {/* Unscheduled Pool */}
          <div className="w-64 shrink-0">
            <UnscheduledPool
              items={unscheduledItems}
              onItemClick={handleItemClick}
              selectedPlatforms={selectedPlatforms}
            />
          </div>
        </div>

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
          // Only allow closing if not currently saving
          if (!isSaving) {
            setEditDrawerOpen(open);
          }
        }}
        onSave={handleSaveEdit}
        isSaving={isSaving}
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
