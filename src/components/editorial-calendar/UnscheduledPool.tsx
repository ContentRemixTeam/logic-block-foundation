import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem } from '@/lib/calendarConstants';
import { CalendarContentCard } from './CalendarContentCard';
import { Inbox, Plus, ArrowRight, CheckCircle2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface UnscheduledPoolProps {
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  selectedPlatforms: string[];
  onAddContentClick?: () => void;
  isCollapsible?: boolean;
}

export function UnscheduledPool({ 
  items, 
  onItemClick, 
  selectedPlatforms, 
  onAddContentClick,
  isCollapsible = true,
}: UnscheduledPoolProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'unscheduled' });
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter items by selected platforms
  const filteredItems = items.filter(item => {
    if (selectedPlatforms.length === 0) return true;
    if (!item.channel) return true;
    return selectedPlatforms.some(p => 
      item.channel?.toLowerCase().includes(p.toLowerCase())
    );
  });

  // Collapsed state
  if (isCollapsed && isCollapsible) {
    return (
      <div 
        ref={setNodeRef}
        className={cn(
          "flex flex-col h-full bg-muted/30 border-l border-border transition-all duration-300",
          "w-12",
          isOver && "bg-primary/5 ring-2 ring-inset ring-primary"
        )}
      >
        {/* Expand button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-10 w-full rounded-none border-b border-border"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Vertical text and count */}
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div 
            className="writing-mode-vertical text-xs font-medium text-muted-foreground whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            Unscheduled
          </div>
          <div className="mt-2 px-2 py-1 rounded bg-muted text-xs font-medium">
            {filteredItems.length}
          </div>
        </div>

        {/* Drop indicator */}
        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-muted/30 border-l border-border transition-all duration-300 relative",
        "w-64",
        isOver && "bg-primary/5 ring-2 ring-inset ring-primary"
      )}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted">
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold flex-1">Unscheduled</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
            {filteredItems.length}
          </span>
          {isCollapsible && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(true)}
              className="h-6 w-6"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
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
