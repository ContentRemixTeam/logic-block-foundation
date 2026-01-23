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
import { FileText } from 'lucide-react';

interface ResumeDraftDialogProps {
  isOpen: boolean;
  draftAge: string | null;
  onResume: () => void;
  onStartFresh: () => void;
}

export function ResumeDraftDialog({
  isOpen,
  draftAge,
  onResume,
  onStartFresh,
}: ResumeDraftDialogProps) {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="mb-0">Resume your draft?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            You have an unfinished draft{draftAge ? ` from ${draftAge}` : ''}. 
            Would you like to continue where you left off, or start fresh?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:space-x-2">
          <AlertDialogCancel onClick={onStartFresh}>
            Start Fresh
          </AlertDialogCancel>
          <AlertDialogAction onClick={onResume}>
            Resume Draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
