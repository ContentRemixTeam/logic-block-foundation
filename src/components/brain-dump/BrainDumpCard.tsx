import React, { useState, memo } from 'react';
import { Trash2, Pencil, Check, X, GripVertical, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { CATEGORY_CONFIG, type BrainDumpItem, type BrainDumpCategory } from '@/hooks/useBrainDump';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BrainDumpCardProps {
  item: BrainDumpItem;
  onDelete: (item: BrainDumpItem) => void;
  onUpdate: (item: BrainDumpItem, newText: string) => void;
  onConvertCategory?: (item: BrainDumpItem, newCategory: BrainDumpCategory) => void;
  isDragging?: boolean;
}

const ACCENT_BAR: Record<BrainDumpCategory, string> = {
  note:     'bg-muted-foreground/40',
  idea:     'bg-accent',
  task:     'bg-primary',
  project:  'bg-primary/70',
  content:  'bg-pink-500/70',
  question: 'bg-orange-500/70',
  win:      'bg-amber-500/80',
  mindset:  'bg-cyan-500/70',
  later:    'bg-slate-400/60',
};

const PILL_TONE: Record<BrainDumpCategory, string> = {
  note:     'bg-muted text-muted-foreground',
  idea:     'bg-accent/15 text-foreground',
  task:     'bg-primary/15 text-foreground',
  project:  'bg-primary/10 text-foreground',
  content:  'bg-pink-500/10 text-foreground',
  question: 'bg-orange-500/10 text-foreground',
  win:      'bg-amber-500/15 text-foreground',
  mindset:  'bg-cyan-500/10 text-foreground',
  later:    'bg-slate-500/10 text-foreground',
};

export const BrainDumpCard = memo(function BrainDumpCard({
  item,
  onDelete,
  onUpdate,
  onConvertCategory,
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
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 pl-5 shadow-sm transition-shadow',
        'hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-60 shadow-lg ring-2 ring-primary/30'
      )}
    >
      {/* Left accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', ACCENT_BAR[item.category])} />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <button
            className="cursor-grab touch-none opacity-30 hover:opacity-70 transition-opacity"
            aria-label="Drag"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              PILL_TONE[item.category]
            )}
          >
            <span>{config.emoji}</span>
            {config.label.slice(0, -1)}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {!editing && (
            <>
              {onConvertCategory && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ArrowRightLeft className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs">Move to…</DropdownMenuLabel>
                    {(['task', 'idea', 'content', 'project', 'question', 'win', 'mindset', 'later', 'note'] as BrainDumpCategory[])
                      .filter(c => c !== item.category)
                      .map(c => (
                        <DropdownMenuItem
                          key={c}
                          onClick={() => onConvertCategory(item, c)}
                        >
                          {CATEGORY_CONFIG[c].emoji} {CATEGORY_CONFIG[c].label.replace(/s$/, '')}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setEditing(true)}
                aria-label="Edit"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDelete(item)}
                aria-label="Delete"
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
            className="min-h-[60px] text-sm resize-none"
            autoFocus
          />
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs">
              <Check className="h-3 w-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground">
          {item.text}
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
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
