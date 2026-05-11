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

      const message = detail.warnings.join(' ');
      toast.warning('Heads up about your browser', {
        description: message,
        duration: 12000,
      });
    };

    window.addEventListener('storage-durability-warning', handler);
    return () => window.removeEventListener('storage-durability-warning', handler);
  }, []);

  return null;
}
