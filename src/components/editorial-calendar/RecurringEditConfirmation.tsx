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
import { Button } from '@/components/ui/button';
import { Repeat } from 'lucide-react';

interface RecurringEditConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'delete';
  onThisOnly: () => void;
  onAllFuture: () => void;
}

export function RecurringEditConfirmation({
  open,
  onOpenChange,
  mode,
  onThisOnly,
  onAllFuture,
}: RecurringEditConfirmationProps) {
  const isDelete = mode === 'delete';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Repeat className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle>
              {isDelete ? 'Delete Recurring Content' : 'Edit Recurring Content'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This is part of a recurring series. Would you like to {isDelete ? 'delete' : 'edit'} just this occurrence or all future occurrences?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              onThisOnly();
              onOpenChange(false);
            }}
          >
            {isDelete ? 'Delete This Only' : 'Edit This Only'}
          </Button>
          <AlertDialogAction
            onClick={() => {
              onAllFuture();
              onOpenChange(false);
            }}
            className={isDelete ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isDelete ? 'Delete All Future' : 'Edit All Future'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
