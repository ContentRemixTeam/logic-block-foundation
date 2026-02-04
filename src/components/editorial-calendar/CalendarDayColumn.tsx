import { useDroppable } from '@dnd-kit/core';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarItem, SCHEDULE_COLORS } from '@/lib/calendarConstants';
import { CalendarContentCard } from './CalendarContentCard';
import { Badge } from '@/components/ui/badge';
import { Palette, Send, Plus } from 'lucide-react';
import { useCalendarDensity } from '@/hooks/useCalendarDensity';
import { CalendarDateMode } from '@/hooks/useCalendarSettings';

interface CalendarDayColumnProps {
  date: Date;
  createItems: CalendarItem[];
  publishItems: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  onAddClick?: (date: Date, lane: 'create' | 'publish') => void;
  view: 'publish' | 'create';
  dateMode?: CalendarDateMode;
}

export function CalendarDayColumn({
  date,
  createItems,
  publishItems,
  onItemClick,
  onAddClick,
  view,
  dateMode = 'dual',
}: CalendarDayColumnProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isCurrentDay = isToday(date);
  const totalItems = createItems.length + publishItems.length;
  const { density } = useCalendarDensity();

  const showCreateLane = dateMode === 'dual' || dateMode === 'create-only';
  const showPublishLane = dateMode === 'dual' || dateMode === 'publish-only';

  return (
    <div className={cn(
      "flex flex-col h-full min-w-0 border-r border-border last:border-r-0",
      isCurrentDay && "bg-primary/5"
    )}>
      {/* Day Header */}
      <div className={cn(
        "px-2 py-2 border-b border-border text-center relative shrink-0",
        isCurrentDay && "bg-primary/10",
        // Touch-friendly header on mobile
        "min-h-[44px] flex flex-col items-center justify-center"
      )}>
        {/* Day name */}
        <div className={cn(
          "text-[10px] font-semibold uppercase tracking-wider mb-0.5",
          isCurrentDay ? "text-primary" : "text-muted-foreground"
        )}>
          {format(date, 'EEE')}
        </div>
        
        {/* Day number with today indicator */}
        <div className="relative inline-flex items-center justify-center">
          {isCurrentDay && (
            <div className="absolute inset-0 -m-1 rounded-full bg-primary/20 animate-pulse" />
          )}
          <span className={cn(
            "relative text-lg font-bold leading-none",
            isCurrentDay ? "text-primary" : "text-foreground"
          )}>
            {format(date, 'd')}
          </span>
        </div>

        {/* Item count badge */}
        {totalItems > 0 && (
          <Badge 
            variant="secondary" 
            className="mt-1 text-[9px] px-1.5 py-0 h-4 font-medium"
          >
            {totalItems}
          </Badge>
        )}
      </div>

      {/* Dual Lane Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Create Lane */}
        {showCreateLane && (
          <DroppableLane
            id={`create-${dateStr}`}
            lane="create"
            items={createItems}
            onItemClick={onItemClick}
            onAddClick={() => onAddClick?.(date, 'create')}
            isHighlighted={view === 'create'}
            density={density}
            isOnlyLane={!showPublishLane}
          />
        )}

        {/* Divider - only show in dual mode */}
        {showCreateLane && showPublishLane && (
          <div className="h-px bg-border shrink-0" />
        )}

        {/* Publish Lane */}
        {showPublishLane && (
          <DroppableLane
            id={`publish-${dateStr}`}
            lane="publish"
            items={publishItems}
            onItemClick={onItemClick}
            onAddClick={() => onAddClick?.(date, 'publish')}
            isHighlighted={view === 'publish'}
            density={density}
            isOnlyLane={!showCreateLane}
          />
        )}
      </div>
    </div>
  );
}

interface DroppableLaneProps {
  id: string;
  lane: 'create' | 'publish';
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  onAddClick?: () => void;
  isHighlighted?: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  isOnlyLane?: boolean;
}

function DroppableLane({ id, lane, items, onItemClick, onAddClick, isHighlighted, density, isOnlyLane }: DroppableLaneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const colors = SCHEDULE_COLORS[lane];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-0 overflow-y-auto transition-colors relative group/lane",
        // In single-lane mode, take full height; otherwise flex equally
        isOnlyLane ? "flex-1" : "flex-1",
        // Density-based padding
        density === 'compact' && "p-1",
        density === 'comfortable' && "p-1.5",
        density === 'spacious' && "p-2",
        colors.bg,
        isOver && "ring-2 ring-inset",
        isOver && lane === 'create' && "ring-teal-500 bg-teal-500/10",
        isOver && lane === 'publish' && "ring-violet-500 bg-violet-500/10",
        isHighlighted && "opacity-100",
        !isHighlighted && "opacity-60"
      )}
    >
      {/* Lane Label with icon */}
      <div className={cn(
        "flex items-center justify-between mb-1 sticky top-0 bg-inherit z-10 py-0.5",
      )}>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider",
          colors.text
        )}>
          {lane === 'create' ? (
            <>
              <Palette className="h-3 w-3" />
              Create
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              Publish
            </>
          )}
        </div>
        {items.length > 0 && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1 py-0 h-4 font-medium border-0",
              lane === 'create' 
                ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" 
                : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
            )}
          >
            {items.length}
          </Badge>
        )}
      </div>

      {/* Items */}
      <div className={cn(
        density === 'compact' && "space-y-1",
        density === 'comfortable' && "space-y-1.5",
        density === 'spacious' && "space-y-2"
      )}>
        {items.map(item => (
          <CalendarContentCard
            key={`${item.id}:${lane}`}
            item={item}
            laneContext={lane}
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </div>

      {/* Empty state with add button */}
      {items.length === 0 && !isOver && (
        <div 
          onClick={onAddClick}
          className={cn(
            "flex flex-col items-center justify-center py-3 px-2 rounded-md border border-dashed text-center cursor-pointer transition-colors hover:bg-muted/50",
            lane === 'create' ? "border-teal-500/30 hover:border-teal-500/50" : "border-violet-500/30 hover:border-violet-500/50"
          )}
        >
          {lane === 'create' ? (
            <>
              <Plus className="h-4 w-4 mb-1 text-teal-500/40 group-hover/lane:text-teal-500" />
              <span className="text-[9px] font-medium text-teal-500/60 group-hover/lane:text-teal-500">Add content</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mb-1 text-violet-500/40 group-hover/lane:text-violet-500" />
              <span className="text-[9px] font-medium text-violet-500/60 group-hover/lane:text-violet-500">Add content</span>
            </>
          )}
        </div>
      )}

      {/* Drop zone active state */}
      {items.length === 0 && isOver && (
        <div className={cn(
          "flex flex-col items-center justify-center py-4 px-2 rounded-md border-2 border-dashed animate-pulse",
          lane === 'create' 
            ? "border-teal-500 bg-teal-500/10" 
            : "border-violet-500 bg-violet-500/10"
        )}>
          <div className={cn(
            "rounded-full p-2 mb-1",
            lane === 'create' ? "bg-teal-500/20" : "bg-violet-500/20"
          )}>
            {lane === 'create' ? (
              <Palette className="h-4 w-4 text-teal-500" />
            ) : (
              <Send className="h-4 w-4 text-violet-500" />
            )}
          </div>
          <span className={cn(
            "text-xs font-medium",
            lane === 'create' ? "text-teal-600 dark:text-teal-400" : "text-violet-600 dark:text-violet-400"
          )}>
            Drop here!
          </span>
        </div>
      )}
    </div>
  );
}
