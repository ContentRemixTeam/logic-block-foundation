import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarItem } from '@/lib/calendarConstants';
import { CalendarContentCard } from './CalendarContentCard';
import { Inbox, Plus, ArrowRight, CheckCircle2, Sparkles, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

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
          "flex flex-col h-full bg-card/50 border-l border-border/40 transition-all duration-300",
          "w-12",
          isOver && "bg-primary/5 ring-2 ring-inset ring-primary/40"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-10 w-full rounded-none border-b border-border/40 hover:bg-muted/50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div 
            className="writing-mode-vertical text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            Unscheduled
          </div>
          <div className="mt-3 h-6 w-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted-foreground">{filteredItems.length}</span>
          </div>
        </div>

        {isOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/5 backdrop-blur-sm">
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
        "flex flex-col h-full bg-card/50 border-l border-border/40 transition-all duration-300 relative",
        "w-64",
        isOver && "bg-primary/5 ring-2 ring-inset ring-primary/40"
      )}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted/60">
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-bold flex-1 text-foreground">Backlog</span>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full tabular-nums">
            {filteredItems.length}
          </span>
          {isCollapsible && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(true)}
              className="h-6 w-6 hover:bg-muted/50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {onAddContentClick && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 gap-2 text-xs font-semibold border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            onClick={onAddContentClick}
          >
            <Plus className="h-3.5 w-3.5" />
            New Content
          </Button>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                All scheduled! 🎉
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px] mx-auto">
                Drag items here to unschedule, or create new content
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-muted/30 text-muted-foreground/60 mb-1">
                <GripVertical className="h-3 w-3" />
                <span className="text-[10px] font-medium">Drag to schedule</span>
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

      {/* Drop zone indicator */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-card shadow-xl border border-primary/20">
            <div className="p-3 rounded-xl bg-primary/10">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-primary">Drop to unschedule</span>
          </div>
        </div>
      )}
    </div>
  );
}
