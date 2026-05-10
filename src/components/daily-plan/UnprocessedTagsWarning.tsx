import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { DESTINATION_TAG_REGEX, DESTINATION_TAG_NAMES, TAG_BY_NAME } from '@/lib/captureTags';

interface UnprocessedTagsWarningProps {
  scratchPadContent: string;
  onProcessTags: () => Promise<void>;
}

export function UnprocessedTagsWarning({
  scratchPadContent,
  onProcessTags,
}: UnprocessedTagsWarningProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const navigate = useNavigate();

  const hasUnprocessedTags = useCallback(() => {
    if (!scratchPadContent?.trim()) return false;
    const regex = new RegExp(DESTINATION_TAG_REGEX.source, 'gi');
    return regex.test(scratchPadContent);
  }, [scratchPadContent]);

  // Browser beforeunload — friendly nudge only
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnprocessedTags()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnprocessedTags]);

  const handleProcessAndLeave = async () => {
    setIsProcessing(true);
    try {
      await onProcessTags();
      setShowDialog(false);
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Failed to process tags:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndLeave = () => {
    setShowDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleStay = () => {
    setShowDialog(false);
    setPendingNavigation(null);
  };

  const getTagCounts = useCallback(() => {
    if (!scratchPadContent) return { total: 0, breakdown: '' };
    const counts: Record<string, number> = {};
    DESTINATION_TAG_NAMES.forEach(t => (counts[t] = 0));
    const regex = new RegExp(DESTINATION_TAG_REGEX.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(scratchPadContent)) !== null) {
      const tag = m[1].toLowerCase();
      counts[tag] = (counts[tag] || 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const parts = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([tag, n]) => {
        const cfg = TAG_BY_NAME[tag];
        return `${n} ${cfg?.label.toLowerCase() || tag}${n > 1 ? 's' : ''}`;
      });
    return { total, breakdown: parts.join(', ') };
  }, [scratchPadContent]);

  const tagInfo = getTagCounts();

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have tagged items to review</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Your scratch pad has <strong>{tagInfo.total} tagged item{tagInfo.total !== 1 ? 's' : ''}</strong>
              {tagInfo.breakdown ? `: ${tagInfo.breakdown}.` : '.'}
            </span>
            <span className="block text-sm text-muted-foreground">
              Nothing will be lost — your scratch pad autosaves. You can review now or sort it later.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleStay}>
            Stay here
          </Button>
          <Button variant="outline" onClick={handleSaveAndLeave}>
            Save and leave
          </Button>
          <Button onClick={handleProcessAndLeave} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reviewing…
              </>
            ) : (
              'Review now'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
