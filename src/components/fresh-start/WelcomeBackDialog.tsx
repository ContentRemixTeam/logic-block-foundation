import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, ArrowRight, Leaf, Loader2 } from 'lucide-react';
import { useFreshStart, type MoveMode, type UndoToken } from '@/hooks/useFreshStart';
import { showUndoToast } from './UndoSnackbar';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysAway: number;
}

/**
 * Warm, calm dialog shown on return after 7+ days away.
 * Three options, one-tap dismiss. Never appears twice for the same return day.
 */
export function WelcomeBackDialog({ open, onOpenChange, daysAway }: Props) {
  const fresh = useFreshStart();
  const [busy, setBusy] = useState<'archive' | 'move' | null>(null);
  const [moveMode, setMoveMode] = useState<MoveMode>('this_week');

  const handleArchive = async () => {
    setBusy('archive');
    try {
      const token = await fresh.archiveOverdue();
      onOpenChange(false);
      if (token.records.some((r) => ('taskIds' in r ? r.taskIds.length : 'planIds' in r ? r.planIds.length : 0))) {
        showUndoToast(token, () => fresh.undo(token));
      } else {
        toast.success("You were already clear. Welcome back. 💛");
      }
    } catch (err) {
      console.error('[WelcomeBackDialog] archive failed', err);
      toast.error("Couldn't tidy right now — try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const handleMove = async () => {
    setBusy('move');
    try {
      const token = await fresh.moveOverdueForward(moveMode);
      onOpenChange(false);
      showUndoToast(token, () => fresh.undo(token));
    } catch (err) {
      console.error('[WelcomeBackDialog] move failed', err);
      toast.error("Couldn't move things right now — try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader className="space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Welcome back.
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
            Life happens — your planner is easy to reset. It's been {daysAway} days.
            Pick what feels right. Nothing gets deleted; everything can be restored.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Option 1 — Fresh start */}
          <button
            onClick={handleArchive}
            disabled={busy !== null}
            className="w-full text-left rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/[0.02] p-4 transition-colors disabled:opacity-60"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/[0.08] flex items-center justify-center shrink-0">
                <Leaf className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">Fresh start</p>
                  {busy === 'archive' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Tidy everything from before today into the archive. Your cycle,
                  notes, reflections, and history stay put.
                </p>
              </div>
            </div>
          </button>

          {/* Option 2 — Move forward */}
          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/[0.08] flex items-center justify-center shrink-0">
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="font-medium text-sm">Move my tasks forward</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bulk-reschedule anything overdue so it lands where you can see it.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Select value={moveMode} onValueChange={(v) => setMoveMode(v as MoveMode)}>
                    <SelectTrigger className="h-9 flex-1 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">All to today</SelectItem>
                      <SelectItem value="this_week">Spread across this week</SelectItem>
                      <SelectItem value="unscheduled">Move to unscheduled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleMove}
                    disabled={busy !== null}
                    className="min-h-11"
                  >
                    {busy === 'move' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Move
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 3 — Just look around */}
          <Button
            variant="ghost"
            className="w-full min-h-11 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
            disabled={busy !== null}
          >
            Just let me look around
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
