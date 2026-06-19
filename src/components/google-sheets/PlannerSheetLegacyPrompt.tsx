import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlannerSheetStatus } from '@/hooks/usePlannerSheetSetup';

const PROMPT_VERSION = '2026-06-legacy-planner-sheet';
const PROMPT_DELAY_MS = 1400;
const REMIND_LATER_MS = 7 * 24 * 60 * 60 * 1000;
const NOT_NOW_MS = 30 * 24 * 60 * 60 * 1000;

type PromptPreference = {
  version?: string;
  mutedUntil?: string;
};

function getStorageKey(userId: string) {
  return `boss-planner:legacy-sheet-prompt:${PROMPT_VERSION}:${userId}`;
}

function readPreference(storageKey: string): PromptPreference | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writePreference(storageKey: string, muteForMs: number) {
  const mutedUntil = new Date(Date.now() + muteForMs).toISOString();

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      version: PROMPT_VERSION,
      mutedUntil,
    }));
  } catch {
    // If localStorage is unavailable, failing open is better than blocking the app.
  }
}

function isMuted(storageKey: string) {
  const preference = readPreference(storageKey);
  if (!preference?.mutedUntil) return false;

  const mutedUntil = Date.parse(preference.mutedUntil);
  return !Number.isNaN(mutedUntil) && mutedUntil > Date.now();
}

interface PlannerSheetLegacyPromptProps {
  enabled: boolean;
  isLoading: boolean;
  status: PlannerSheetStatus;
  userId?: string;
}

export function PlannerSheetLegacyPrompt({
  enabled,
  isLoading,
  status,
  userId,
}: PlannerSheetLegacyPromptProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const storageKey = useMemo(
    () => (userId ? getStorageKey(userId) : null),
    [userId],
  );

  const hasPlannerSheet = Boolean(
    status.connected &&
    status.spreadsheet_url &&
    status.is_healthy,
  );

  const shouldPrompt = Boolean(
    enabled &&
    storageKey &&
    !isLoading &&
    !hasPlannerSheet &&
    !location.pathname.startsWith('/settings'),
  );

  useEffect(() => {
    if (!shouldPrompt || !storageKey || isMuted(storageKey)) {
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [shouldPrompt, storageKey]);

  const mutePrompt = (muteForMs: number) => {
    if (storageKey) {
      writePreference(storageKey, muteForMs);
    }
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open) {
      mutePrompt(REMIND_LATER_MS);
      return;
    }

    setOpen(nextOpen);
  };

  const setupLabel = status.connected || status.spreadsheet_url
    ? 'Finish setup in Settings'
    : 'Set up in Settings';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <DialogTitle>Back up your planner in Google Drive</DialogTitle>
          <DialogDescription>
            Your current planner data stays in the app. Connecting Google adds a private planner Sheet you own and gets your account ready for the new storage rollout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Use the Google Drive account where you want your planner backup to live.</span>
          </div>
          <div className="flex gap-3">
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>The app creates the Sheet for you, so you do not have to build anything manually.</span>
          </div>
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>You can keep using the planner while setup stays optional for existing accounts.</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => mutePrompt(NOT_NOW_MS)}>
            Not right now
          </Button>
          <Button variant="outline" onClick={() => mutePrompt(REMIND_LATER_MS)}>
            Remind me next week
          </Button>
          <Button asChild onClick={() => mutePrompt(REMIND_LATER_MS)}>
            <Link to="/settings">{setupLabel}</Link>
          </Button>
        </DialogFooter>

        <Button variant="link" size="sm" asChild className="mx-auto h-auto p-0 text-xs">
          <Link to="/help/planner-storage" onClick={() => mutePrompt(REMIND_LATER_MS)}>
            How Google Drive planner storage works
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
