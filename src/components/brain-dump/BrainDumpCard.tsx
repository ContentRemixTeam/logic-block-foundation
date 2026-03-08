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

// Deterministic slight rotation based on item id
function getRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return (hash % 5) - 2; // -2 to 2 degrees
}

const POST_IT_STYLES: Record<BrainDumpCategory, string> = {
  note: 'bg-yellow-200 dark:bg-yellow-400/90 border-yellow-300 dark:border-yellow-500 text-yellow-950',
  idea: 'bg-purple-200 dark:bg-purple-400/90 border-purple-300 dark:border-purple-500 text-purple-950',
  task: 'bg-blue-200 dark:bg-blue-400/90 border-blue-300 dark:border-blue-500 text-blue-950',
  project: 'bg-green-200 dark:bg-green-400/90 border-green-300 dark:border-green-500 text-green-950',
};

export const BrainDumpCard = memo(function BrainDumpCard({
  item,
  onDelete,
  onUpdate,
  isDragging,
}: BrainDumpCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const config = CATEGORY_CONFIG[item.category];
  const rotation = getRotation(item.id);

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
    rotate: `${rotation}deg`,
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
        'group relative rounded-sm border p-4 transition-all',
        POST_IT_STYLES[item.category],
        'shadow-[2px_3px_8px_rgba(0,0,0,0.15)] hover:shadow-[3px_5px_12px_rgba(0,0,0,0.22)]',
        'hover:rotate-0 hover:scale-[1.02]',
        (isDragging || isSortableDragging) && 'opacity-60 rotate-3 scale-105 shadow-xl',
      )}
    >
      {/* Tape effect */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-4 bg-white/40 dark:bg-white/20 rounded-sm" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <button
            className="cursor-grab touch-none opacity-40 hover:opacity-80"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider opacity-60">
            {config.emoji} {config.label.slice(0, -1)}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!editing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-black/10"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-black/10 text-red-700"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-3 w-3" />
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
            className="min-h-[60px] text-sm bg-white/30 border-white/40 resize-none"
            autoFocus
          />
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs bg-black/20 hover:bg-black/30 text-inherit border-0">
              <Check className="h-3 w-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs hover:bg-black/10">
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
          {item.text}
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] opacity-50 font-medium">
          {format(parseISO(item.created_at), 'MMM d, h:mm a')}
        </span>
        {item.is_completed && (
          <Badge className="text-[10px] h-4 bg-black/15 text-inherit border-0">Done</Badge>
        )}
      </div>
    </div>
  );
});
