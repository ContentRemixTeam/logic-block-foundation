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

function DroppableColumn({ category, children, count, isFullWidth }: { category: BrainDumpCategory; children: React.ReactNode; count: number; isFullWidth?: boolean }) {
  const config = CATEGORY_CONFIG[category];
  const { setNodeRef, isOver } = useDroppable({ id: category });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border-2 p-3 min-h-[300px] transition-colors',
        config.borderClass,
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
        isFullWidth && 'max-w-3xl mx-auto'
      )}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
        <span className="text-lg">{config.emoji}</span>
        <h3 className="font-semibold text-sm">{config.label}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
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
    const grouped: Record<BrainDumpCategory, BrainDumpItem[]> = {
      note: [], idea: [], task: [], project: [],
    };
    items.forEach(item => {
      grouped[item.category].push(item);
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
    if (['note', 'idea', 'task', 'project'].includes(targetCategory) && targetCategory !== draggedItem.category) {
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
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
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
                />
              ))}
            </SortableContext>
            {columns[cat].length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8 italic">
                Drag items here or create a new {CATEGORY_CONFIG[cat].label.toLowerCase().slice(0, -1)}
              </p>
            )}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="rotate-3 scale-105">
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
