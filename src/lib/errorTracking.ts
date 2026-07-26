import * as Sentry from "@sentry/react";
import { logError } from "@/lib/errorLogger";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initErrorTracking() {
  // Sentry is optional: only enabled in production when a DSN is configured.
  if (SENTRY_DSN && import.meta.env.PROD) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: "production",
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 0,
        replaysSessionSampleRate: 0,
      });
    } catch {
      /* never let error tracking break the app */
    }
  }

  // Global handlers always run so async/promise errors reach the backend
  // logger (log-error edge function), not just React render errors.
  const seen = new Set<string>();
  const report = (type: string, message: string, stack?: string) => {
    const key = `${type}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    void logError({
      error_type: type,
      error_message: message?.slice(0, 2000) || "Unknown error",
      error_stack: stack?.slice(0, 5000),
      component: "global",
    });
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    report(
      "UNHANDLED_REJECTION",
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason.stack : undefined
    );
  });

  window.addEventListener("error", (event) => {
    if (!event.message) return;
    report("WINDOW_ERROR", event.message, event.error?.stack);
  });
}

export function isSentryEnabled() {
  return Boolean(SENTRY_DSN && import.meta.env.PROD);
}
