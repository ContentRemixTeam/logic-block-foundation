import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { initStorageDurability } from "./lib/storageDurability";
import { initErrorTracking } from "./lib/errorTracking";

initErrorTracking();


const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const clearBrowserCaches = async () => {
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
};

/**
 * Preview/iframe safety only.
 *
 * Production updates are handled by ONE mechanism: the waiting service worker
 * + PWAUpdatePrompt (registerType: "prompt"). We deliberately do NOT clear
 * caches or force a reload in production here — that used to race with the
 * update prompt and could reload someone mid-edit.
 */
const cleanupPreviewServiceWorkers = async () => {
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");

  if (!isPreviewHost && !isInIframe()) return;

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
    await clearBrowserCaches();
  } catch {
    /* non-fatal */
  }
};

void cleanupPreviewServiceWorkers();

// Request persistent storage and detect private/incognito mode early so
// IndexedDB-backed offline drafts survive disk pressure across browsers.
initStorageDurability().catch(() => {
  /* non-fatal */
});

// Disable console logs in production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
