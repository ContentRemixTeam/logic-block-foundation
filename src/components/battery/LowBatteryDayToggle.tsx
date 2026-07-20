/**
 * Low Battery Day mode toggle.
 *
 * On enable: snapshot today's non-bare-minimum tasks into
 * daily_plans.deferred_task_ids and move them to tomorrow.
 * Uses a direct supabase update (bypassing useRescheduleTracking) so the
 * friction/coaching banner does NOT fire — this is intentional self-care.
 */
import { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BatteryLow, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OnceHint } from '@/components/system/OnceHint';

interface Props {
  dateISO: string;
  /** Current low_battery_mode + deferred_task_ids from today's daily_plans row (if any). */
  active: boolean;
  deferredTaskIds: string[];
  onChanged?: () => void;
  className?: string;
}

export function LowBatteryDayToggle({
  dateISO,
  active,
  deferredTaskIds,
  onChanged,
  className,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['bare-minimum-tasks'] });
    qc.invalidateQueries({ queryKey: ['daily-plan'] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    onChanged?.();
  };

  const enableLowBatteryDay = async () => {
    if (!user) return;
    setBusy(true);
    try {
      // 1. Fetch today's non-bare-minimum, not-done tasks
      const { data: tasks, error: fetchErr } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('scheduled_date', dateISO)
        .eq('is_bare_minimum', false)
        .neq('status', 'done');
      if (fetchErr) throw fetchErr;
      const ids = (tasks ?? []).map((t) => t.task_id as string);

      const tomorrowISO = format(addDays(parseISO(dateISO), 1), 'yyyy-MM-dd');

      // 2. Move them to tomorrow (bypasses reschedule tracking on purpose)
      if (ids.length > 0) {
        const { error: moveErr } = await supabase
          .from('tasks')
          .update({ scheduled_date: tomorrowISO })
          .in('task_id', ids)
          .eq('user_id', user.id);
        if (moveErr) throw moveErr;
      }

      // 3. Persist the snapshot + mode on daily_plans (upsert so a row exists)
      const { error: planErr } = await supabase
        .from('daily_plans')
        .upsert(
          {
            user_id: user.id,
            date: dateISO,
            low_battery_mode: true,
            deferred_task_ids: ids,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' },
        );
      if (planErr) throw planErr;

      toast.success('Low Battery Day on', {
        description: `Everything else is safely parked for tomorrow (${ids.length} task${ids.length === 1 ? '' : 's'}). Doing your minimum today is a win.`,
        duration: 6000,
      });
      invalidate();
    } catch (err) {
      console.error('[LowBatteryDay] enable failed', err);
      toast.error("Couldn't switch modes. Your tasks are safe — try again.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const restoreDay = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (deferredTaskIds.length > 0) {
        const { error: moveErr } = await supabase
          .from('tasks')
          .update({ scheduled_date: dateISO })
          .in('task_id', deferredTaskIds)
          .eq('user_id', user.id);
        if (moveErr) throw moveErr;
      }
      const { error: planErr } = await supabase
        .from('daily_plans')
        .update({
          low_battery_mode: false,
          deferred_task_ids: [],
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('date', dateISO);
      if (planErr) throw planErr;

      toast.success('Restored. Take it at your pace.');
      invalidate();
    } catch (err) {
      console.error('[LowBatteryDay] restore failed', err);
      toast.error("Couldn't restore. Your tasks are safe — try again.");
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn('gap-1.5 max-w-full whitespace-normal text-left', className)}
        onClick={restoreDay}
        disabled={busy}
      >
        <Undo2 className="h-3.5 w-3.5 shrink-0" />
        Restore my day
      </Button>
    );
  }

  return (
    <>
      <div className={cn('flex flex-col gap-1.5 max-w-full min-w-0', className)}>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 self-start max-w-full whitespace-normal text-left h-auto py-1.5"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
        >
          <BatteryLow className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate sm:whitespace-normal">Low Battery Day</span>
        </Button>
        <OnceHint hintKey="low-battery-day-intro">
          Parks everything except your bare minimum for tomorrow. Nothing lost, fully reversible.
        </OnceHint>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Low Battery Day?</AlertDialogTitle>
            <AlertDialogDescription>
              Your bare minimum stays. Everything else will be gently parked for tomorrow — nothing gets deleted,
              and you can restore your day any time. Rest counts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={enableLowBatteryDay} disabled={busy}>
              Yes, park the rest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
