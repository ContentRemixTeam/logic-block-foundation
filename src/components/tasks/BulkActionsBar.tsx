import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  CalendarIcon, 
  Trash2, 
  CheckCircle2, 
  X, 
  Flag,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onReschedule: (date: Date) => void;
  onDelete: () => void;
  onComplete: () => void;
  onChangePriority: (priority: string | null) => void;
  onCancelSelection: () => void;
  isLoading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onReschedule,
  onDelete,
  onComplete,
  onChangePriority,
  onCancelSelection,
  isLoading = false,
}: BulkActionsBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const handleReschedule = (date: Date | undefined) => {
    if (date) {
      onReschedule(date);
      setRescheduleDate(undefined);
      setIsRescheduleOpen(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="flex items-center gap-2 bg-background border rounded-lg shadow-lg px-4 py-3">
          {/* Selection count */}
          <Badge variant="secondary" className="text-sm">
            {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
          </Badge>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Reschedule */}
          <Popover open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                disabled={isLoading}
              >
                <CalendarIcon className="h-4 w-4" />
                Reschedule
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={handleReschedule}
                className="pointer-events-auto"
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Mark Complete */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={onComplete}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Complete
          </Button>

          {/* Change Priority */}
          <Select onValueChange={(value) => onChangePriority(value === 'none' ? null : value)} disabled={isLoading}>
            <SelectTrigger className="w-auto gap-2 h-9">
              <Flag className="h-4 w-4" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>

          {/* Delete */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Cancel */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onCancelSelection}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected tasks will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
