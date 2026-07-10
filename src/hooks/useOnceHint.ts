/**
 * One-time dismissible hint tracker.
 * Stores a boolean in localStorage under `once-hint:<key>`.
 * Returns { seen, dismiss } — components render the hint only when !seen.
 */
import { useCallback, useEffect, useState } from 'react';

const prefix = 'once-hint:';

export function useOnceHint(key: string) {
  const storageKey = prefix + key;
  const [seen, setSeen] = useState<boolean>(true); // default true = don't show during hydration

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(storageKey) === '1');
    } catch {
      setSeen(true);
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* noop */ }
    setSeen(true);
  }, [storageKey]);

  return { seen, dismiss };
}
