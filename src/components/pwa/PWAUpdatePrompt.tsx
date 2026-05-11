import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useState } from 'react';
import { syncPendingMutations } from '@/lib/offlineSync';

/**
 * Update prompt for new app versions.
 *
 * Behavior:
 *  - Polls for updates every 15 minutes (and on tab focus / regaining network).
 *  - Cannot be dismissed permanently — staying on a stale build risks data
 *    schema mismatches. The user can hide it for the current session via "Later"
 *    but it will reappear on the next route mount.
 *  - "Refresh now" performs a TRUE hard reload:
 *      1. Flush every pending offline mutation to the server.
 *      2. Clear all Service Worker caches (so HTML / JS chunks are re-fetched).
 *      3. Activate the waiting SW (skipWaiting) and reload with cache bypass.
 */
export function PWAUpdatePrompt() {
  const [hiddenForSession, setHiddenForSession] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;

      // Poll every 15 min for new builds.
      setInterval(() => {
        r.update().catch(() => undefined);
      }, 15 * 60 * 1000);

      // Also check when the user comes back to the tab or regains network —
      // catches users who left the tab open overnight.
      const recheck = () => r.update().catch(() => undefined);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') recheck();
      });
      window.addEventListener('online', recheck);
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1) Flush any pending offline mutations BEFORE killing caches.
      try {
        await syncPendingMutations();
      } catch (err) {
        console.warn('[PWAUpdate] flush failed, continuing with reload', err);
      }

      // 2) Clear all SW caches so the next load fetches the new shell.
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (err) {
        console.warn('[PWAUpdate] cache purge failed', err);
      }

      // 3) Activate waiting SW + reload. updateServiceWorker(true) calls
      //    skipWaiting + window.location.reload() under the hood.
      await updateServiceWorker(true);
    } catch (err) {
      console.error('[PWAUpdate] refresh failed, hard reloading', err);
      // Fallback: full reload regardless.
      window.location.reload();
    }
  }, [updateServiceWorker]);

  if (!needRefresh || hiddenForSession) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="App update available"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,420px)] animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-start gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg border border-primary-foreground/10">
        <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            A new version is ready
          </p>
          <p className="text-xs opacity-90 mt-1">
            Refresh to load the latest improvements. Your unsaved drafts will be
            saved first.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 px-3 text-xs font-semibold"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              {refreshing ? 'Saving & refreshing…' : 'Refresh now'}
            </Button>
            <button
              onClick={() => setHiddenForSession(true)}
              className="text-xs opacity-80 hover:opacity-100 underline-offset-2 hover:underline"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
