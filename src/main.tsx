import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { initStorageDurability } from "./lib/storageDurability";

const APP_CACHE_RELEASE = "mastermind-community-prompts-2026-09-02-v1";

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

const recoverFromStaleBuild = async () => {
  const isPreviewHost =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");

  if (isPreviewHost || isInIframe()) {
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
      await clearBrowserCaches();
    } catch {
      /* non-fatal */
    }
    return;
  }

  try {
    if (localStorage.getItem("boss-planner-cache-release") === APP_CACHE_RELEASE) {
      return;
    }

    localStorage.setItem("boss-planner-cache-release", APP_CACHE_RELEASE);
    await clearBrowserCaches();

    const url = new URL(window.location.href);
    url.searchParams.set("app-refresh", APP_CACHE_RELEASE);
    window.location.replace(url.toString());
  } catch {
    /* non-fatal */
  }
};

void recoverFromStaleBuild();

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
