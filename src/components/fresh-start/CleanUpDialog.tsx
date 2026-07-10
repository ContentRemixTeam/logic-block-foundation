import { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useFreshStart, type FreshStartCounts, type MoveMode } from '@/hooks/useFreshStart';
import { showUndoToast } from './UndoSnackbar';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Manual "Clean up" dialog. Available from Tasks header and Settings.
 * Three independent actions, each with a live count preview and undo.
 */
export function CleanUpDialog({ open, onOpenChange }: Props) {
  const fresh = useFreshStart();
  const [counts, setCounts] = useState<FreshStartCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [archiveBefore, setArchiveBefore] = useState<string>(
    format(addDays(new Date(), -30), 'yyyy-MM-dd'),
  );
  const [moveMode, setMoveMode] = useState<MoveMode>('this_week');
  const [completedDays, setCompletedDays] = useState<'30' | '60' | '90'>('60');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingCounts(true);
    fresh
      .previewCounts()
      .then((c) => {
        if (!cancelled) setCounts(c);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => {
        if (!cancelled) setLoadingCounts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fresh]);

  const runArchiveBefore = async () => {
    setBusy('archive_before');
    try {
      const token = await fresh.archiveBefore(archiveBefore);
      onOpenChange(false);
      showUndoToast(token, () => fresh.undo(token));
    } catch {
      toast.error("Couldn't tidy right now — try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const runMove = async () => {
    setBusy('move');
    try {
      const token = await fresh.moveOverdueForward(moveMode);
      onOpenChange(false);
      showUndoToast(token, () => fresh.undo(token));
    } catch {
      toast.error("Couldn't move things right now — try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const runArchiveCompleted = async () => {
    setBusy('archive_completed');
    try {
      const token = await fresh.archiveCompletedOlderThan(Number(completedDays));
      onOpenChange(false);
      showUndoToast(token, () => fresh.undo(token));
    } catch {
      toast.error("Couldn't tidy right now — try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const completedCount =
    completedDays === '30'
      ? counts?.completedOlderThan30
      : completedDays === '60'
        ? counts?.completedOlderThan60
        : counts?.completedOlderThan90;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Clean up</DialogTitle>
          <DialogDescription>
            Tidy your planner without losing anything. Everything you archive
            can be restored from the Archive page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Section 1: archive before date */}
          <section className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium">Archive everything before…</p>
                <p className="text-xs text-muted-foreground">
                  Sweep tasks and past daily plans into the archive.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0">
                <Label htmlFor="archive-before-date" className="sr-only">
                  Cut-off date
                </Label>
                <Input
                  id="archive-before-date"
                  type="date"
                  value={archiveBefore}
                  onChange={(e) => setArchiveBefore(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button
                variant="secondary"
                onClick={runArchiveBefore}
                disabled={busy !== null}
                className="min-h-11"
              >
                {busy === 'archive_before' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Archive
              </Button>
            </div>
          </section>

          {/* Section 2: reschedule overdue */}
          <section className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Move overdue tasks forward</p>
              <p className="text-xs text-muted-foreground">
                {loadingCounts
                  ? 'Counting…'
                  : `${counts?.overdueTasks ?? 0} task${counts?.overdueTasks === 1 ? '' : 's'} waiting for you.`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={moveMode} onValueChange={(v) => setMoveMode(v as MoveMode)}>
                <SelectTrigger className="flex-1 min-w-0 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">All to today</SelectItem>
                  <SelectItem value="this_week">Spread across this week</SelectItem>
                  <SelectItem value="unscheduled">Move to unscheduled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={runMove}
                disabled={busy !== null || (counts?.overdueTasks ?? 0) === 0}
                className="min-h-11"
              >
                {busy === 'move' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Move
              </Button>
            </div>
          </section>

          {/* Section 3: archive completed older than */}
          <section className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Archive completed items older than…</p>
              <p className="text-xs text-muted-foreground">
                {loadingCounts
                  ? 'Counting…'
                  : `${completedCount ?? 0} completed task${completedCount === 1 ? '' : 's'} in that range.`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={completedDays} onValueChange={(v) => setCompletedDays(v as '30' | '60' | '90')}>
                <SelectTrigger className="flex-1 min-w-0 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={runArchiveCompleted}
                disabled={busy !== null || (completedCount ?? 0) === 0}
                className="min-h-11"
              >
                {busy === 'archive_completed' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Archive
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
