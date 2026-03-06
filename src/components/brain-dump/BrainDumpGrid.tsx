import React, { memo } from 'react';
import { BrainDumpCard } from './BrainDumpCard';
import { type BrainDumpItem } from '@/hooks/useBrainDump';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

interface BrainDumpGridProps {
  items: BrainDumpItem[];
  onDelete: (item: BrainDumpItem) => void;
  onUpdate: (item: BrainDumpItem, newText: string) => void;
}

export const BrainDumpGrid = memo(function BrainDumpGrid({
  items,
  onDelete,
  onUpdate,
}: BrainDumpGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  return (
    <DndContext sensors={sensors}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
          {items.map(item => (
            <div key={item.id} className="break-inside-avoid">
              <BrainDumpCard
                item={item}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});
