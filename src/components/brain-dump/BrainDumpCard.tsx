import React, { useState, memo } from 'react';
import { Trash2, Pencil, Check, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_CONFIG, type BrainDumpItem, type BrainDumpCategory } from '@/hooks/useBrainDump';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BrainDumpCardProps {
  item: BrainDumpItem;
  onDelete: (item: BrainDumpItem) => void;
  onUpdate: (item: BrainDumpItem, newText: string) => void;
  isDragging?: boolean;
}

export const BrainDumpCard = memo(function BrainDumpCard({
  item,
  onDelete,
  onUpdate,
  isDragging,
}: BrainDumpCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const config = CATEGORY_CONFIG[item.category];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id, data: { item } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(item, editText.trim());
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(item.text);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border-2 p-3 shadow-sm transition-all',
        config.bgClass, config.borderClass,
        (isDragging || isSortableDragging) && 'opacity-50 rotate-2 scale-105 shadow-lg',
        'hover:shadow-md'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <button
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Badge variant="outline" className="text-xs font-medium">
            {config.emoji} {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!editing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-[60px] text-sm bg-background/50 resize-none"
            autoFocus
          />
          <div className="flex gap-1.5">
            <Button size="sm" variant="default" onClick={handleSave} className="h-7 text-xs">
              <Check className="h-3 w-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {item.text}
        </p>
      )}

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {format(parseISO(item.created_at), 'MMM d, h:mm a')}
        </span>
        {item.is_completed && (
          <Badge variant="secondary" className="text-[10px] h-4">Done</Badge>
        )}
      </div>
    </div>
  );
});
