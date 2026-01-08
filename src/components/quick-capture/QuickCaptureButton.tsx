import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useQuickCapture } from './QuickCaptureProvider';

export function QuickCaptureButton() {
  const { openQuickCapture } = useQuickCapture();

  return (
    <Button
      onClick={() => openQuickCapture()}
      size="lg"
      className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all z-50"
      aria-label="Quick capture (Cmd+K)"
    >
      <Zap className="h-6 w-6" />
    </Button>
  );
}
