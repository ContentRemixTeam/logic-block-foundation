import { useDroppable } from '@dnd-kit/core';
import { format, isToday, isWeekend } from 'date-fns';
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
  const isWeekendDay = isWeekend(date);
  const totalItems = createItems.length + publishItems.length;
  const { density } = useCalendarDensity();

  const showCreateLane = dateMode === 'dual' || dateMode === 'create-only';
  const showPublishLane = dateMode === 'dual' || dateMode === 'publish-only';

  return (
    <div className={cn(
      "flex flex-col h-full min-w-0 border-r border-border/40 last:border-r-0 transition-colors",
      isCurrentDay && "bg-primary/[0.03]",
      isWeekendDay && !isCurrentDay && "bg-muted/20",
    )}>
      {/* Day Header - refined editorial style */}
      <div className={cn(
        "px-2 py-3 text-center relative shrink-0 border-b border-border/40",
        "min-h-[52px] flex flex-col items-center justify-center gap-0.5",
      )}>
        {/* Day name */}
        <div className={cn(
          "text-[10px] font-semibold uppercase tracking-widest",
          isCurrentDay ? "text-primary" : "text-muted-foreground/70"
        )}>
          {format(date, 'EEE')}
        </div>
        
        {/* Day number with today pill */}
        <div className={cn(
          "relative inline-flex items-center justify-center rounded-full transition-colors",
          isCurrentDay 
            ? "bg-primary text-primary-foreground h-8 w-8"
            : "h-8 w-8"
        )}>
          <span className={cn(
            "text-base font-bold leading-none",
            !isCurrentDay && "text-foreground"
          )}>
            {format(date, 'd')}
          </span>
        </div>

        {/* Item count - subtle pill */}
        {totalItems > 0 && (
          <span className={cn(
            "text-[9px] font-medium px-1.5 py-px rounded-full",
            isCurrentDay 
              ? "bg-primary/10 text-primary" 
              : "bg-muted text-muted-foreground"
          )}>
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
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

        {/* Divider - subtle gradient line */}
        {showCreateLane && showPublishLane && (
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent shrink-0 mx-2" />
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

  const laneColors = lane === 'create' 
    ? { 
        accent: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50/30 dark:bg-teal-950/10',
        ring: 'ring-teal-400/50',
        dropBg: 'bg-teal-50 dark:bg-teal-950/30',
        dropBorder: 'border-teal-400/50',
        emptyBorder: 'border-teal-300/30 hover:border-teal-400/40',
        emptyText: 'text-teal-400/60 group-hover/lane:text-teal-500',
      }
    : {
        accent: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50/30 dark:bg-violet-950/10',
        ring: 'ring-violet-400/50',
        dropBg: 'bg-violet-50 dark:bg-violet-950/30',
        dropBorder: 'border-violet-400/50',
        emptyBorder: 'border-violet-300/30 hover:border-violet-400/40',
        emptyText: 'text-violet-400/60 group-hover/lane:text-violet-500',
      };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-0 overflow-y-auto transition-all relative group/lane",
        isOnlyLane ? "flex-1" : "flex-1",
        // Density-based padding
        density === 'compact' && "p-1",
        density === 'comfortable' && "p-1.5",
        density === 'spacious' && "p-2",
        // Subtle background tint
        isHighlighted && laneColors.bg,
        isOver && `ring-2 ring-inset ${laneColors.ring} ${laneColors.dropBg}`,
        !isHighlighted && "opacity-50 hover:opacity-70",
        isHighlighted && "opacity-100",
      )}
    >
      {/* Lane Label - minimal */}
      <div className="flex items-center justify-between mb-1.5 sticky top-0 bg-inherit z-10 py-0.5">
        <div className={cn(
          "flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em]",
          laneColors.accent,
          "opacity-60"
        )}>
          {lane === 'create' ? (
            <>
              <Palette className="h-2.5 w-2.5" />
              <span>Create</span>
            </>
          ) : (
            <>
              <Send className="h-2.5 w-2.5" />
              <span>Publish</span>
            </>
          )}
        </div>
        {items.length > 0 && (
          <span className={cn(
            "text-[9px] font-bold tabular-nums",
            laneColors.accent,
            "opacity-50"
          )}>
            {items.length}
          </span>
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

      {/* Empty state - clean dashed add button */}
      {items.length === 0 && !isOver && (
        <div 
          onClick={onAddClick}
          className={cn(
            "flex items-center justify-center gap-1.5 py-3 px-2 rounded-lg border border-dashed cursor-pointer",
            "transition-all duration-200 hover:scale-[1.02]",
            laneColors.emptyBorder
          )}
        >
          <Plus className={cn("h-3.5 w-3.5", laneColors.emptyText)} />
          <span className={cn("text-[10px] font-medium", laneColors.emptyText)}>
            Add
          </span>
        </div>
      )}

      {/* Drop zone active state */}
      {items.length === 0 && isOver && (
        <div className={cn(
          "flex flex-col items-center justify-center py-4 px-2 rounded-lg border-2 border-dashed",
          laneColors.dropBorder, laneColors.dropBg,
        )}>
          <div className={cn(
            "rounded-full p-2 mb-1",
            lane === 'create' ? "bg-teal-100 dark:bg-teal-900/40" : "bg-violet-100 dark:bg-violet-900/40"
          )}>
            {lane === 'create' ? (
              <Palette className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            ) : (
              <Send className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            )}
          </div>
          <span className={cn(
            "text-xs font-semibold",
            laneColors.accent
          )}>
            Drop here
          </span>
        </div>
      )}
    </div>
  );
}
