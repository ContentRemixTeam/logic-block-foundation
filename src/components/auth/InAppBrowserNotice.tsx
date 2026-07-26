import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { isInAppBrowser } from "@/lib/resilientStorage";

/**
 * Gentle, dismissible notice shown only inside Instagram/Facebook/TikTok
 * in-app browsers, where sessions often get wiped between visits.
 */
export function InAppBrowserNotice() {
  const [detected] = useState(() => isInAppBrowser());
  const [dismissed, setDismissed] = useState(false);

  if (!detected || dismissed) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-muted/60 p-3 text-sm text-foreground"
    >
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="flex-1 leading-relaxed">
        You're viewing this inside another app. For the best experience — and to stay signed in —
        tap the <span className="font-medium">•••</span> menu and choose{" "}
        <span className="font-medium">"Open in browser"</span> (Safari or Chrome).
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss browser notice"
        className="-m-1 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
