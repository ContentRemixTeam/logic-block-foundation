/**
 * Storage durability utilities.
 *
 * Goals:
 *  - Request persistent storage so the browser will not evict IndexedDB / Cache
 *    Storage / localStorage under pressure (Chrome, Edge, Firefox, Safari 17+).
 *  - Detect environments where IndexedDB is unavailable or broken
 *    (Safari Private Mode, Firefox Private Mode in some versions, locked-down
 *    iOS WKWebView shells, embedded browsers in Instagram/Facebook/TikTok, etc.)
 *  - Surface low-quota warnings before the user actually loses data.
 *
 * This module is safe to call multiple times and on any platform; every call
 * is wrapped in try/catch and degrades silently when an API is missing.
 */

let initPromise: Promise<StorageDurabilityReport> | null = null;

export interface StorageDurabilityReport {
  persistent: boolean;
  quotaBytes: number | null;
  usageBytes: number | null;
  idbAvailable: boolean;
  inPrivateMode: boolean;
  warnings: string[];
}

const LOW_QUOTA_BYTES = 50 * 1024 * 1024; // 50 MB

async function probeIndexedDb(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false;
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      // Some browsers block opens for ~10s in private mode — bail out early.
      const timeout = setTimeout(() => finish(false), 1500);
      try {
        const req = indexedDB.open('__lovable_probe__');
        req.onerror = () => {
          clearTimeout(timeout);
          finish(false);
        };
        req.onsuccess = () => {
          clearTimeout(timeout);
          try {
            req.result.close();
            indexedDB.deleteDatabase('__lovable_probe__');
          } catch {
            /* ignore */
          }
          finish(true);
        };
        req.onblocked = () => {
          clearTimeout(timeout);
          finish(true); // open succeeded, just blocked by another connection
        };
      } catch {
        clearTimeout(timeout);
        finish(false);
      }
    });
  } catch {
    return false;
  }
}

export async function initStorageDurability(): Promise<StorageDurabilityReport> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const report: StorageDurabilityReport = {
      persistent: false,
      quotaBytes: null,
      usageBytes: null,
      idbAvailable: false,
      inPrivateMode: false,
      warnings: [],
    };

    // 1. Probe IndexedDB. If unavailable, we are likely in Private Mode or a
    //    sandboxed in-app browser (Instagram / Facebook / TikTok webview).
    report.idbAvailable = await probeIndexedDb();
    if (!report.idbAvailable) {
      report.inPrivateMode = true;
      report.warnings.push(
        'IndexedDB is unavailable — offline drafts will not persist. ' +
          'You may be in Private/Incognito mode or an in-app browser. ' +
          'Open this app in your main browser (Safari, Chrome, Edge, or Firefox) for safe local backup.',
      );
    }

    // 2. Ask for persistent storage. Browsers that grant it will not evict
    //    our data under pressure. Safari 17+, Chrome, Edge, Firefox support this.
    try {
      const storage = (navigator as any).storage;
      if (storage?.persisted && storage?.persist) {
        const already = await storage.persisted();
        report.persistent = already || (await storage.persist());
        if (!report.persistent) {
          report.warnings.push(
            'Browser denied persistent storage — your local cache may be cleared if disk space runs low. ' +
              'Add this app to your Home Screen or install it as a PWA to gain persistence.',
          );
        }
      }

      // 3. Quota check.
      if (storage?.estimate) {
        const est = await storage.estimate();
        report.quotaBytes = typeof est.quota === 'number' ? est.quota : null;
        report.usageBytes = typeof est.usage === 'number' ? est.usage : null;
        if (report.quotaBytes != null && report.quotaBytes < LOW_QUOTA_BYTES) {
          report.warnings.push(
            `Low storage quota detected (${Math.round(report.quotaBytes / 1024 / 1024)} MB). ` +
              'Free up disk space to keep offline drafts safe.',
          );
        }
      }
    } catch {
      /* ignore — APIs unavailable */
    }

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[storageDurability]', report);
    }

    // Surface a one-time warning to the user via window event so a UI layer
    // can show a toast without us importing toast utilities here.
    if (report.warnings.length > 0 && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('storage-durability-warning', { detail: report }),
        );
      } catch {
        /* ignore */
      }
    }

    return report;
  })();

  return initPromise;
}

export function getStorageDurabilityReport(): Promise<StorageDurabilityReport> {
  return initStorageDurability();
}
