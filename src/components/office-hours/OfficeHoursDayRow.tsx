import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
}

interface OfficeHoursDayRowProps {
  dayOfWeek: number;
  dayName: string;
  blocks: TimeBlock[];
  onAddBlock: (dayOfWeek: number) => void;
  onUpdateBlock: (id: string, field: 'start_time' | 'end_time', value: string) => void;
  onRemoveBlock: (id: string) => void;
  errors: Record<string, string>;
}

export function OfficeHoursDayRow({
  dayOfWeek,
  dayName,
  blocks,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  errors,
}: OfficeHoursDayRowProps) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm w-24">{dayName}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAddBlock(dayOfWeek)}
          className="h-7 px-2 text-xs gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Block
        </Button>
      </div>
      
      {blocks.length === 0 && (
        <div className="text-xs text-muted-foreground ml-24 py-1">
          No office hours set
        </div>
      )}
      
      {blocks.map((block) => {
        const blockError = errors[block.id];
        
        return (
          <div key={block.id} className="flex items-center gap-2 ml-24">
            <Input
              type="time"
              value={block.start_time}
              onChange={(e) => onUpdateBlock(block.id, 'start_time', e.target.value)}
              className={cn(
                "w-28 h-8 text-sm",
                blockError && "border-destructive"
              )}
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="time"
              value={block.end_time}
              onChange={(e) => onUpdateBlock(block.id, 'end_time', e.target.value)}
              className={cn(
                "w-28 h-8 text-sm",
                blockError && "border-destructive"
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveBlock(block.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
            {blockError && (
              <span className="text-xs text-destructive">{blockError}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
