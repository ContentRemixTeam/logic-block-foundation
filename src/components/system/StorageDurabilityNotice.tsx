import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { StorageDurabilityReport } from '@/lib/storageDurability';

/**
 * Listens for the one-time `storage-durability-warning` event and surfaces it
 * to the user so they know if their browser/profile cannot reliably persist
 * offline data (e.g. Safari Private Mode, Instagram in-app browser).
 */
export function StorageDurabilityNotice() {
  const shown = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      if (shown.current) return;
      const detail = (e as CustomEvent<StorageDurabilityReport>).detail;
      if (!detail?.warnings?.length) return;
      shown.current = true;

      const hasPrivateModeWarning = detail.warnings.some(w =>
        /private|incognito|unavailable/i.test(w)
      );
      const message = hasPrivateModeWarning
        ? 'This browser may not save local planner data reliably. Tap "Fix it" for the plain-English guide.'
        : 'This browser may clear local planner cache if storage gets tight. Tap "Fix it" for the plain-English guide.';
      toast.warning('Heads up about your browser', {
        description: message,
        duration: 15000,
        action: {
          label: 'Fix it',
          onClick: () => {
            window.location.href = '/help/browser-storage';
          },
        },
      });
    };

    window.addEventListener('storage-durability-warning', handler);
    return () => window.removeEventListener('storage-durability-warning', handler);
  }, []);

  return null;
}
