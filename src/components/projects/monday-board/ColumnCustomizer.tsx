import { BOARD_COLUMNS } from '@/types/project';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';

interface ColumnCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: string[];
  onUpdate: (columns: string[]) => void;
}

export function ColumnCustomizer({ open, onOpenChange, visibleColumns, onUpdate }: ColumnCustomizerProps) {
  const handleToggle = (columnId: string) => {
    const column = BOARD_COLUMNS.find(c => c.id === columnId);
    if (column?.required) return; // Can't hide required columns

    if (visibleColumns.includes(columnId)) {
      onUpdate(visibleColumns.filter(c => c !== columnId));
    } else {
      onUpdate([...visibleColumns, columnId]);
    }
  };

  const handleShowAll = () => {
    onUpdate(BOARD_COLUMNS.map(c => c.id));
  };

  const handleShowMinimal = () => {
    onUpdate(BOARD_COLUMNS.filter(c => c.required).map(c => c.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Columns</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {BOARD_COLUMNS.map(column => (
            <div key={column.id} className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Checkbox
                id={column.id}
                checked={visibleColumns.includes(column.id)}
                onCheckedChange={() => handleToggle(column.id)}
                disabled={column.required}
              />
              <Label 
                htmlFor={column.id} 
                className="flex-1 cursor-pointer"
              >
                {column.label}
                {column.required && (
                  <span className="text-xs text-muted-foreground ml-2">(required)</span>
                )}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={handleShowAll}>
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={handleShowMinimal}>
            Minimal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
