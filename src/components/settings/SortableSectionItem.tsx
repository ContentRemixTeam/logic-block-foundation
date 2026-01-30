import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionId, SECTION_DEFINITIONS, SectionZone } from '@/types/dailyPage';
import { cn } from '@/lib/utils';

interface SortableSectionItemProps {
  id: SectionId;
  index: number;
  totalItems: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  zoneConfig: { label: string; color: string };
}

export function SortableSectionItem({
  id,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
  zoneConfig,
}: SortableSectionItemProps) {
  const section = SECTION_DEFINITIONS[id];
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border bg-card min-h-[56px]',
        'touch-manipulation', // Better touch handling
        isDragging && 'opacity-50 shadow-lg z-10'
      )}
    >
      {/* Drag handle - 44px touch target */}
      <button
        className="flex items-center justify-center w-11 h-11 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Section info */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm truncate block">{section.label}</span>
      </div>

      {/* Zone badge */}
      <Badge className={`${zoneConfig.color} text-xs shrink-0 hidden sm:flex`}>
        {zoneConfig.label}
      </Badge>

      {/* Up/Down arrows for accessibility and mobile fallback - 44px touch targets */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          <ChevronUp className="h-4 w-4" />
          <span className="sr-only">Move up</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={onMoveDown}
          disabled={index === totalItems - 1}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="sr-only">Move down</span>
        </Button>
      </div>
    </div>
  );
}
