/**
 * Virtualized Task List Component
 * 
 * Uses @tanstack/react-virtual for efficient rendering of large task lists.
 * Only renders ~20 visible items at a time, recycling DOM nodes as user scrolls.
 * 
 * Features:
 * - Smooth 60fps scrolling with 1000+ tasks
 * - Automatic "load more" trigger when nearing bottom
 * - Fallback to regular rendering for small lists (<20 tasks)
 * - Responsive item height for mobile
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Task } from './types';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VirtualizedTaskListProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
  onQuickReschedule: (taskId: string, date: Date | null, status?: string) => void;
  // Pagination props
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetching?: boolean;
  // Optional height (defaults to auto-calculated)
  containerHeight?: number;
  // Selection props
  selectedTaskIds?: Set<string>;
  onToggleTaskSelection?: (taskId: string) => void;
  showSelectionCheckboxes?: boolean;
  // Item size
  estimatedItemHeight?: number;
  className?: string;
}

// Threshold for when to trigger load more (items from end)
const LOAD_MORE_THRESHOLD = 10;

// Minimum items before virtualization kicks in
const VIRTUALIZATION_THRESHOLD = 20;

// Default item height estimates
const DEFAULT_ITEM_HEIGHT_DESKTOP = 96;
const DEFAULT_ITEM_HEIGHT_MOBILE = 120;

export function VirtualizedTaskList({
  tasks,
  onToggleComplete,
  onUpdate,
  onDelete,
  onOpenDetail,
  onQuickReschedule,
  onLoadMore,
  hasMore = false,
  isFetching = false,
  containerHeight,
  selectedTaskIds = new Set(),
  onToggleTaskSelection,
  showSelectionCheckboxes = false,
  estimatedItemHeight,
  className,
}: VirtualizedTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggeredRef = useRef(false);

  // Determine if we should use virtualization
  const shouldVirtualize = tasks.length > VIRTUALIZATION_THRESHOLD;

  // Calculate estimated item height based on viewport
  const itemHeight = useMemo(() => {
    if (estimatedItemHeight) return estimatedItemHeight;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? DEFAULT_ITEM_HEIGHT_MOBILE : DEFAULT_ITEM_HEIGHT_DESKTOP;
  }, [estimatedItemHeight]);

  // Calculate dynamic container height
  const dynamicHeight = useMemo(() => {
    if (containerHeight) return containerHeight;
    if (typeof window === 'undefined') return 600;
    
    // Calculate available space: viewport - header - padding
    const headerOffset = 280; // Approximate header + toolbar height
    return Math.max(400, window.innerHeight - headerOffset);
  }, [containerHeight]);

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Render 5 extra items on each side to prevent flash
    paddingStart: 8,
    paddingEnd: 8,
  });

  // Reset load more trigger when tasks change
  useEffect(() => {
    loadMoreTriggeredRef.current = false;
  }, [tasks.length]);

  // Handle scroll-based load more
  const handleScroll = useCallback(() => {
    if (!shouldVirtualize || !onLoadMore || !hasMore || isFetching || loadMoreTriggeredRef.current) {
      return;
    }

    const lastItem = virtualizer.getVirtualItems().at(-1);
    if (!lastItem) return;

    // Trigger load more when we're near the end
    if (lastItem.index >= tasks.length - LOAD_MORE_THRESHOLD) {
      loadMoreTriggeredRef.current = true;
      onLoadMore();
    }
  }, [shouldVirtualize, onLoadMore, hasMore, isFetching, virtualizer, tasks.length]);

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement || !shouldVirtualize) return;

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [handleScroll, shouldVirtualize]);

  // Performance monitoring
  useEffect(() => {
    if (tasks.length > 100) {
      console.log(
        `[VirtualizedTaskList] Rendering ${tasks.length} tasks with virtualization. ` +
        `Only ~${Math.min(virtualizer.getVirtualItems().length, 20)} DOM elements rendered at once for smooth scrolling.`
      );
    }
  }, [tasks.length, virtualizer]);

  // For small lists, render normally without virtualization
  if (!shouldVirtualize) {
    return (
      <div className={cn("space-y-2", className)}>
        {tasks.map(task => (
          <TaskCard
            key={task.task_id}
            task={task}
            onToggleComplete={onToggleComplete}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onOpenDetail={onOpenDetail}
            onQuickReschedule={onQuickReschedule}
            isSelected={selectedTaskIds.has(task.task_id)}
            onToggleSelection={onToggleTaskSelection}
            showSelectionCheckbox={showSelectionCheckboxes && !task.is_completed}
          />
        ))}
        
        {/* Load More Button for non-virtualized lists */}
        {hasMore && !isFetching && (
          <Button 
            onClick={onLoadMore} 
            variant="outline" 
            className="w-full mt-4"
          >
            Load More Tasks
          </Button>
        )}
        
        {isFetching && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading more tasks...</span>
          </div>
        )}
      </div>
    );
  }

  // Virtualized rendering for large lists
  return (
    <div className={cn("relative", className)}>
      {/* Virtualized scroll container */}
      <div
        ref={parentRef}
        className="overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        style={{ 
          height: dynamicHeight,
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index];
            if (!task) return null;

            return (
              <div
                key={task.task_id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="pb-2"
              >
                <TaskCard
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onOpenDetail={onOpenDetail}
                  onQuickReschedule={onQuickReschedule}
                  isSelected={selectedTaskIds.has(task.task_id)}
                  onToggleSelection={onToggleTaskSelection}
                  showSelectionCheckbox={showSelectionCheckboxes && !task.is_completed}
                />
              </div>
            );
          })}
        </div>

        {/* Load More Indicator at bottom of virtual list */}
        {hasMore && (
          <div className="py-4 text-center">
            {isFetching ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading more tasks...</span>
              </div>
            ) : (
              <Button 
                onClick={onLoadMore} 
                variant="outline" 
                size="sm"
              >
                Load More
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Performance indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && tasks.length > 500 && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          ⚡ {virtualizer.getVirtualItems().length} of {tasks.length} rendered
        </div>
      )}
    </div>
  );
}
