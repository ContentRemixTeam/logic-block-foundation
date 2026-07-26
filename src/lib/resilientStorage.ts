/**
 * Resilient auth storage.
 *
 * Inside Instagram / Facebook / TikTok in-app browsers and Safari Private Mode,
 * localStorage can be partitioned, quota-limited, or throw on access. When that
 * happens the Supabase client would fail to persist the session and bounce the
 * user back to /auth. This adapter tries localStorage first and transparently
 * falls back to an in-memory store so auth keeps working for the session.
 */

const memoryStore = new Map<string, string>();

function localStorageAvailable(): boolean {
  try {
    const probe = "__lb_storage_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export const resilientAuthStorage = {
  getItem: (key: string): string | null => {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) return value;
    } catch {
      /* fall through to memory */
    }
    return memoryStore.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    memoryStore.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* memory copy is enough for this session */
    }
  },
  removeItem: (key: string): void => {
    memoryStore.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* non-fatal */
    }
  },
};

export const isPersistentStorageAvailable = localStorageAvailable;

/** Detects Instagram / Facebook / TikTok / LINE in-app webviews. */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Pinterest|Snapchat/i.test(ua);
}
