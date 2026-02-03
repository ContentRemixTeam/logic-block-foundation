import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem } from '@/lib/calendarConstants';
import { CalendarContentCard } from './CalendarContentCard';
import { Inbox, Plus, ArrowRight } from 'lucide-react';

interface UnscheduledPoolProps {
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  selectedPlatforms: string[];
  onAddContentClick?: () => void;
}

export function UnscheduledPool({ items, onItemClick, selectedPlatforms, onAddContentClick }: UnscheduledPoolProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'unscheduled' });

  // Filter items by selected platforms
  const filteredItems = items.filter(item => {
    if (selectedPlatforms.length === 0) return true;
    if (!item.channel) return true;
    return selectedPlatforms.some(p => 
      item.channel?.toLowerCase().includes(p.toLowerCase())
    );
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-muted/30 border-l border-border transition-colors",
        isOver && "bg-primary/5 ring-2 ring-inset ring-primary"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Unscheduled</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredItems.length}
          </span>
        </div>

        {/* Add Content Button */}
        {onAddContentClick && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 gap-2"
            onClick={onAddContentClick}
          >
            <Plus className="h-4 w-4" />
            Add Content
          </Button>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 px-3">
              <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground font-medium">
                No content to schedule
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-[180px] mx-auto">
                Click "Add Content" above to create something, then drag it to a day
              </p>
              <div className="flex items-center justify-center gap-1 mt-3 text-xs text-primary">
                <ArrowRight className="h-3 w-3" />
                <span>Drag items to calendar</span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground/60 text-center mb-2 px-2">
                Drag items to calendar to schedule
              </p>
              {filteredItems.map(item => (
                <CalendarContentCard
                  key={`${item.id}:pool`}
                  item={item}
                  laneContext="pool"
                  onClick={() => onItemClick?.(item)}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
