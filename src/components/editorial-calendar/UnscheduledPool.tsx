import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem } from '@/lib/calendarConstants';
import { CalendarContentCard } from './CalendarContentCard';
import { Inbox, Plus, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

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
        "flex flex-col h-full bg-muted/30 border-l border-border transition-all duration-200",
        isOver && "bg-primary/5 ring-2 ring-inset ring-primary"
      )}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted">
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold">Unscheduled</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto font-medium">
            {filteredItems.length}
          </span>
        </div>

        {/* Add Content Button */}
        {onAddContentClick && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 gap-2 shadow-sm"
            onClick={onAddContentClick}
          >
            <Plus className="h-4 w-4" />
            Add Content
          </Button>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 px-3">
              {/* Celebratory empty state */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-3">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                All content is scheduled!
              </p>
              <p className="text-xs text-muted-foreground max-w-[180px] mx-auto leading-relaxed">
                Drag items here to unschedule them or create new content
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-primary font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Great work!</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-muted/50 text-muted-foreground mb-2">
                <ArrowRight className="h-3 w-3" />
                <span className="text-[11px] font-medium">Drag items to calendar</span>
              </div>
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

      {/* Drop zone indicator when dragging over */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/5 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card shadow-lg border-2 border-primary border-dashed animate-pulse">
            <Inbox className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-primary">Drop to unschedule</span>
          </div>
        </div>
      )}
    </div>
  );
}
