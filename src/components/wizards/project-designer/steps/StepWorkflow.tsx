import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProjectDesignerData, ColumnDefinition } from '@/types/projectDesigner';
import { COLUMN_COLORS } from '@/lib/projectDesignerTemplates';
import { GripVertical, Plus, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepWorkflowProps {
  data: ProjectDesignerData;
  onChange: (updates: Partial<ProjectDesignerData>) => void;
}

interface SortableColumnProps {
  column: ColumnDefinition;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function SortableColumn({ column, onRename, onColorChange, onRemove, canRemove }: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border bg-card group',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:bg-accent rounded p-1"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-6 h-6 rounded-full shrink-0 border-2 border-background shadow-sm"
            style={{ backgroundColor: column.color }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="grid grid-cols-5 gap-2">
            {COLUMN_COLORS.map(color => (
              <button
                key={color}
                className={cn(
                  'w-8 h-8 rounded-full border-2',
                  column.color === color ? 'border-primary' : 'border-transparent'
                )}
                style={{ backgroundColor: color }}
                onClick={() => onColorChange(column.id, color)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        value={column.name}
        onChange={(e) => onRename(column.id, e.target.value)}
        className="flex-1 h-8 min-w-[100px]"
      />

      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(column.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function StepWorkflow({ data, onChange }: StepWorkflowProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = data.columns.findIndex(c => c.id === active.id);
      const newIndex = data.columns.findIndex(c => c.id === over.id);
      
      onChange({
        columns: arrayMove(data.columns, oldIndex, newIndex),
      });
    }
  };

  const handleRename = (id: string, name: string) => {
    onChange({
      columns: data.columns.map(c => 
        c.id === id ? { ...c, name } : c
      ),
    });
  };

  const handleColorChange = (id: string, color: string) => {
    onChange({
      columns: data.columns.map(c => 
        c.id === id ? { ...c, color } : c
      ),
    });
  };

  const handleRemove = (id: string) => {
    if (data.columns.length <= 2) return;
    onChange({
      columns: data.columns.filter(c => c.id !== id),
    });
  };

  const handleAdd = () => {
    if (data.columns.length >= 10) return;
    const newColumn: ColumnDefinition = {
      id: String(Date.now()),
      name: 'New Stage',
      color: COLUMN_COLORS[data.columns.length % COLUMN_COLORS.length],
    };
    onChange({
      columns: [...data.columns, newColumn],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Define Your Workflow Stages</h2>
        <p className="text-muted-foreground">
          Customize the stages items will move through. Drag to reorder, click colors to change.
        </p>
      </div>

      {/* Visual flow preview */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto pb-2">
        {data.columns.map((col, idx) => (
          <div key={col.id} className="flex items-center gap-1 shrink-0">
            <span
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: col.color }}
            >
              {col.name || 'Unnamed'}
            </span>
            {idx < data.columns.length - 1 && (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        ))}
      </div>

      {/* Editable columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={data.columns.map(c => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="space-y-2">
            {data.columns.map(column => (
              <SortableColumn
                key={column.id}
                column={column}
                onRename={handleRename}
                onColorChange={handleColorChange}
                onRemove={handleRemove}
                canRemove={data.columns.length > 2}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {data.columns.length < 10 && (
        <Button
          variant="outline"
          onClick={handleAdd}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Stage
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Minimum 2 stages, maximum 10 stages
      </p>
    </div>
  );
}
