import { useDroppable } from '@dnd-kit/core';
import { format, isToday, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarItem } from '@/lib/calendarConstants';
import { CalendarContentCard } from './CalendarContentCard';
import { Edit3, Send, Plus } from 'lucide-react';
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
  const { density } = useCalendarDensity();

  const showCreateLane = dateMode === 'dual' || dateMode === 'create-only';
  const showPublishLane = dateMode === 'dual' || dateMode === 'publish-only';

  return (
    <div className={cn(
      "flex flex-col h-full min-w-0 border-r border-border/40 last:border-r-0 transition-colors",
      isCurrentDay && "bg-gradient-to-b from-[#FFF0F6] to-[#F9F0FF]",
      isWeekendDay && !isCurrentDay && "bg-[#FAFAF9]",
    )}>
      {/* Day Header */}
      <div className="px-2 py-3 text-center relative shrink-0 border-b border-border/40 min-h-[52px] flex flex-col items-center justify-center gap-0.5">
        {/* Day name */}
        <div className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          isCurrentDay ? "text-primary" : "text-muted-foreground"
        )}>
          {format(date, 'EEE')}
        </div>
        
        {/* Day number */}
        {isCurrentDay ? (
          <div 
            className="flex items-center justify-center rounded-full text-white font-extrabold text-xl"
            style={{
              width: 38,
              height: 38,
              background: 'linear-gradient(135deg, #E8387A, #C026A8)',
              boxShadow: '0 2px 8px rgba(232,56,122,0.4)',
            }}
          >
            {format(date, 'd')}
          </div>
        ) : (
          <span className={cn(
            "text-[26px] font-extrabold tracking-tight leading-none",
            isWeekendDay ? "text-muted-foreground" : "text-foreground"
          )}>
            {format(date, 'd')}
          </span>
        )}
      </div>

      {/* Dual Lane Container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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

        {showCreateLane && showPublishLane && (
          <hr className="border-dashed border-border mx-0 my-0 shrink-0" />
        )}

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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-0 overflow-y-auto transition-all relative group/lane flex-1",
        density === 'compact' && "p-1",
        density === 'comfortable' && "p-1.5",
        density === 'spacious' && "p-2",
        isOver && "ring-2 ring-inset ring-primary/30 bg-primary/5",
        !isHighlighted && "opacity-50 hover:opacity-70",
        isHighlighted && "opacity-100",
      )}
    >
      {/* Lane Label */}
      <div className="mb-1">
        {lane === 'create' ? (
          <div className="flex items-center gap-1.5 text-teal-600 text-[10px] font-bold tracking-widest uppercase py-1">
            <Edit3 className="w-2.5 h-2.5" /> Create
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-violet-600 text-[10px] font-bold tracking-widest uppercase py-1">
            <Send className="w-2.5 h-2.5" /> Publish
          </div>
        )}
      </div>

      {/* Items with 6px gap */}
      <div className="flex flex-col gap-1.5">
        {items.map(item => (
          <CalendarContentCard
            key={`${item.id}:${lane}`}
            item={item}
            laneContext={lane}
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </div>

      {/* Add button */}
      {items.length === 0 && !isOver && (
        <button
          onClick={onAddClick}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground border border-dashed border-border rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-150 mt-1"
        >
          + Add
        </button>
      )}

      {/* Drop zone active state */}
      {items.length === 0 && isOver && (
        <div className={cn(
          "flex items-center justify-center py-4 px-2 rounded-lg border-2 border-dashed",
          lane === 'create' 
            ? "border-teal-400/50 bg-teal-50 dark:bg-teal-950/30" 
            : "border-violet-400/50 bg-violet-50 dark:bg-violet-950/30",
        )}>
          <span className={cn(
            "text-xs font-semibold",
            lane === 'create' ? "text-teal-600" : "text-violet-600"
          )}>
            Drop here
          </span>
        </div>
      )}
    </div>
  );
}
