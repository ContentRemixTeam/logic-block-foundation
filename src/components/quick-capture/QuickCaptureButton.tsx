import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useQuickCapture } from './QuickCaptureProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function QuickCaptureButton() {
  const { openQuickCapture } = useQuickCapture();
  const isMobile = useIsMobile();

  return (
    <Button
      onClick={() => openQuickCapture()}
      size="lg"
      className={cn(
        "fixed rounded-full shadow-lg hover:shadow-xl transition-all z-50",
        isMobile 
          // Mobile: center-bottom, safe-area aware
          ? "left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] h-14 w-14"
          // Desktop: bottom-right
          : "bottom-6 right-6 h-14 w-14"
      )}
      aria-label="Quick capture"
    >
      <Zap className="h-6 w-6" />
    </Button>
  );
}
