import { formatDistanceToNow } from "date-fns";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DraftRestoreBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
  draftAge?: Date | string | null;
  className?: string;
}

/**
 * Banner shown when a modal opens with an existing draft.
 * Allows users to restore or dismiss the draft.
 */
export function DraftRestoreBanner({
  onRestore,
  onDismiss,
  draftAge,
  className,
}: DraftRestoreBannerProps) {
  const ageText = draftAge
    ? formatDistanceToNow(new Date(draftAge), { addSuffix: true })
    : "recently";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 mb-4 rounded-lg border",
        "bg-warning/10 border-warning/30 text-warning-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle className="h-4 w-4 text-warning shrink-0" />
        <span>
          You have an unsaved draft from <strong>{ageText}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRestore}
          className="h-8 text-xs gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Restore
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="h-6 w-6"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface DraftStatusFooterProps {
  hasDraft: boolean;
  className?: string;
}

/**
 * Small status indicator for modal footers showing draft is saved locally.
 */
export function DraftStatusFooter({ hasDraft, className }: DraftStatusFooterProps) {
  if (!hasDraft) return null;

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      💾 Draft saved locally
    </span>
  );
}

interface SaveErrorBannerProps {
  error: string;
  onRetry: () => void;
  className?: string;
}

/**
 * Banner shown when save fails, with retry button.
 */
export function SaveErrorBanner({ error, onRetry, className }: SaveErrorBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 mb-4 rounded-lg border",
        "bg-destructive/10 border-destructive/30",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Save failed: {error}</span>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onRetry}
        className="h-8 text-xs"
      >
        Retry
      </Button>
    </div>
  );
}
