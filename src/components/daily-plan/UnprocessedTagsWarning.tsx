import { useEffect, useCallback, useState } from 'react';
import { useBlocker } from 'react-router-dom';
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
import { Loader2 } from 'lucide-react';

interface UnprocessedTagsWarningProps {
  scratchPadContent: string;
  onProcessTags: () => Promise<void>;
}

const TAG_REGEX = /#(task|idea|thought|win)\b/gi;

export function UnprocessedTagsWarning({ 
  scratchPadContent, 
  onProcessTags 
}: UnprocessedTagsWarningProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if there are unprocessed tags
  const hasUnprocessedTags = useCallback(() => {
    if (!scratchPadContent?.trim()) return false;
    return TAG_REGEX.test(scratchPadContent);
  }, [scratchPadContent]);

  // Block navigation when there are unprocessed tags
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnprocessedTags() && currentLocation.pathname !== nextLocation.pathname
  );

  const handleProcessAndLeave = async () => {
    setIsProcessing(true);
    try {
      await onProcessTags();
      // After processing, proceed with navigation
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    } catch (error) {
      console.error('Failed to process tags:', error);
      setIsProcessing(false);
    }
  };

  const handleLeaveWithoutProcessing = () => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleStay = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  // Count tags for display
  const getTagCounts = useCallback(() => {
    if (!scratchPadContent) return { total: 0, breakdown: '' };
    
    const counts: Record<string, number> = { task: 0, idea: 0, thought: 0, win: 0 };
    let match;
    const regex = new RegExp(TAG_REGEX.source, 'gi');
    
    while ((match = regex.exec(scratchPadContent)) !== null) {
      const tag = match[1].toLowerCase();
      counts[tag] = (counts[tag] || 0) + 1;
    }
    
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const parts = [];
    if (counts.task > 0) parts.push(`${counts.task} task${counts.task > 1 ? 's' : ''}`);
    if (counts.idea > 0) parts.push(`${counts.idea} idea${counts.idea > 1 ? 's' : ''}`);
    if (counts.thought > 0) parts.push(`${counts.thought} thought${counts.thought > 1 ? 's' : ''}`);
    if (counts.win > 0) parts.push(`${counts.win} win${counts.win > 1 ? 's' : ''}`);
    
    return { total, breakdown: parts.join(', ') };
  }, [scratchPadContent]);

  const tagInfo = getTagCounts();

  return (
    <AlertDialog open={blocker.state === 'blocked'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            📝 Unprocessed Tags Found
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your scratch pad has <strong>{tagInfo.total} unprocessed tag{tagInfo.total > 1 ? 's' : ''}</strong>:
            </p>
            <p className="text-sm text-muted-foreground">
              {tagInfo.breakdown}
            </p>
            <p className="mt-2">
              Would you like to process them before leaving?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleStay}>
            Stay on page
          </AlertDialogCancel>
          <Button 
            variant="outline" 
            onClick={handleLeaveWithoutProcessing}
          >
            Leave without processing
          </Button>
          <Button 
            onClick={handleProcessAndLeave}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Process & Leave'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
