import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { initStorageDurability } from "./lib/storageDurability";

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
