import React, { useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { BrainDumpCard } from './BrainDumpCard';
import { CATEGORY_CONFIG, type BrainDumpItem, type BrainDumpCategory } from '@/hooks/useBrainDump';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BrainDumpBoardProps {
  items: BrainDumpItem[];
  onDelete: (item: BrainDumpItem) => void;
  onUpdate: (item: BrainDumpItem, newText: string) => void;
  onConvertCategory: (item: BrainDumpItem, newCategory: BrainDumpCategory) => void;
  filterCategory?: 'all' | BrainDumpCategory;
}

const ALL_CATEGORIES: BrainDumpCategory[] = [
  'task', 'idea', 'content', 'project', 'question', 'win', 'mindset', 'later', 'note',
];

function DroppableColumn({ category, children, count, isFullWidth }: { category: BrainDumpCategory; children: React.ReactNode; count: number; isFullWidth?: boolean }) {
  const config = CATEGORY_CONFIG[category];
  const { setNodeRef, isOver } = useDroppable({ id: category });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border border-border/60 bg-card/40 p-3 min-h-[300px] transition-colors',
        isOver && 'ring-2 ring-primary/40 bg-primary/5',
        isFullWidth && 'max-w-3xl mx-auto'
      )}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/40">
        <span className="text-base">{config.emoji}</span>
        <h3 className="font-medium text-sm tracking-wide uppercase text-muted-foreground">
          {config.label}
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className={cn(
        'flex-1 gap-3 overflow-y-auto',
        isFullWidth
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-min'
          : 'space-y-2'
      )}>
        {children}
      </div>
    </div>
  );
}

export function BrainDumpBoard({ items, onDelete, onUpdate, onConvertCategory, filterCategory = 'all' }: BrainDumpBoardProps) {
  const [activeItem, setActiveItem] = useState<BrainDumpItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const columns = useMemo(() => {
    const grouped = ALL_CATEGORIES.reduce((acc, c) => {
      acc[c] = [];
      return acc;
    }, {} as Record<BrainDumpCategory, BrainDumpItem[]>);
    items.forEach(item => {
      if (grouped[item.category]) grouped[item.category].push(item);
    });
    return grouped;
  }, [items]);

  const visibleCategories = useMemo(() => {
    if (filterCategory !== 'all') return [filterCategory] as BrainDumpCategory[];
    return Object.keys(columns) as BrainDumpCategory[];
  }, [filterCategory, columns]);

  const isSingleCategory = visibleCategories.length === 1;

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data?.current?.item as BrainDumpItem | undefined;
    if (item) setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || !active) return;

    const draggedItem = active.data?.current?.item as BrainDumpItem | undefined;
    if (!draggedItem) return;

    const targetCategory = over.id as BrainDumpCategory;
    if (ALL_CATEGORIES.includes(targetCategory) && targetCategory !== draggedItem.category) {
      onConvertCategory(draggedItem, targetCategory);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn(
        'grid gap-4',
        isSingleCategory
          ? 'grid-cols-1'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
      )}>
        {visibleCategories.map(cat => (
          <DroppableColumn key={cat} category={cat} count={columns[cat].length} isFullWidth={isSingleCategory}>
            <SortableContext items={columns[cat].map(i => i.id)} strategy={verticalListSortingStrategy}>
              {columns[cat].map(item => (
                <BrainDumpCard
                  key={item.id}
                  item={item}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onConvertCategory={onConvertCategory}
                />
              ))}
            </SortableContext>
            {columns[cat].length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8 italic">
                Drag items here or capture a new {CATEGORY_CONFIG[cat].label.toLowerCase().replace(/s$/, '')}.
              </p>
            )}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="scale-[1.02]">
            <BrainDumpCard
              item={activeItem}
              onDelete={() => {}}
              onUpdate={() => {}}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
