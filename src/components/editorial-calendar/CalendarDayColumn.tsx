import { useDroppable } from '@dnd-kit/core';
import { format, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarItem, SCHEDULE_COLORS } from '@/lib/calendarConstants';
import { CalendarContentCard } from './CalendarContentCard';

interface CalendarDayColumnProps {
  date: Date;
  createItems: CalendarItem[];
  publishItems: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  view: 'publish' | 'create';
}

export function CalendarDayColumn({
  date,
  createItems,
  publishItems,
  onItemClick,
  view,
}: CalendarDayColumnProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const isCurrentDay = isToday(date);

  return (
    <div className={cn(
      "flex flex-col min-w-0 border-r border-border last:border-r-0",
      isCurrentDay && "bg-primary/5"
    )}>
      {/* Day Header */}
      <div className={cn(
        "px-2 py-1.5 border-b border-border text-center",
        isCurrentDay && "bg-primary/10"
      )}>
        <div className={cn(
          "text-xs font-medium",
          isCurrentDay ? "text-primary" : "text-muted-foreground"
        )}>
          {format(date, 'EEE')}
        </div>
        <div className={cn(
          "text-lg font-semibold",
          isCurrentDay ? "text-primary" : "text-foreground"
        )}>
          {format(date, 'd')}
        </div>
      </div>

      {/* Dual Lane Container */}
      <div className="flex-1 flex flex-col">
        {/* Create Lane */}
        <DroppableLane
          id={`create-${dateStr}`}
          lane="create"
          items={createItems}
          onItemClick={onItemClick}
          isHighlighted={view === 'create'}
        />

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Publish Lane */}
        <DroppableLane
          id={`publish-${dateStr}`}
          lane="publish"
          items={publishItems}
          onItemClick={onItemClick}
          isHighlighted={view === 'publish'}
        />
      </div>
    </div>
  );
}

interface DroppableLaneProps {
  id: string;
  lane: 'create' | 'publish';
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  isHighlighted?: boolean;
}

function DroppableLane({ id, lane, items, onItemClick, isHighlighted }: DroppableLaneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const colors = SCHEDULE_COLORS[lane];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 p-1.5 min-h-[80px] transition-colors",
        colors.bg,
        isOver && "ring-2 ring-inset",
        isOver && lane === 'create' && "ring-teal-500",
        isOver && lane === 'publish' && "ring-violet-500",
        isHighlighted && "opacity-100",
        !isHighlighted && "opacity-60"
      )}
    >
      {/* Lane Label */}
      <div className={cn(
        "text-[10px] font-medium uppercase tracking-wider mb-1",
        colors.text
      )}>
        {lane === 'create' ? 'Create' : 'Publish'}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map(item => (
          <CalendarContentCard
            key={item.id}
            item={item}
            onClick={() => onItemClick?.(item)}
            compact
          />
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className={cn(
          "text-[10px] text-center py-2 rounded border border-dashed",
          lane === 'create' ? "border-teal-500/30 text-teal-500/50" : "border-violet-500/30 text-violet-500/50"
        )}>
          Drop here
        </div>
      )}
    </div>
  );
}
