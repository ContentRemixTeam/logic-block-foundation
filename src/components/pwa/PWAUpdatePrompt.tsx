import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

export function PWAUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg">
        <RefreshCw className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">
          Update available
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateServiceWorker(true)}
          className="h-7 px-3 text-xs font-semibold"
        >
          Refresh
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
