import { useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BatteryLow, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useBareMinimumTemplate,
  useBareMinimumTasks,
  useAddTemplateAsTask,
  useToggleBareMinimum,
} from '@/hooks/useBareMinimum';
import { EnergyChip } from './EnergyChip';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useCelebrate } from '@/hooks/useCelebrate';
import { useTodayBattery } from '@/hooks/useBatteryCheckin';
import { OnceHint } from '@/components/system/OnceHint';

interface Props {
  dateISO: string;
  compact?: boolean;
  className?: string;
}

/**
 * Top-of-day calm block:
 *   - shows tasks flagged is_bare_minimum for `dateISO`
 *   - shows template items not yet added (with quick "Add to today")
 * Zero-guilt copy. Never blocks the rest of the plan.
 */
export function BareMinimumSection({ dateISO, compact, className }: Props) {
  const { items: templateItems } = useBareMinimumTemplate();
  const { data: tasks = [] } = useBareMinimumTasks(dateISO);
  const addTemplate = useAddTemplateAsTask();
  const toggleBM = useToggleBareMinimum();
  const qc = useQueryClient();
  const { user } = useAuth();
  const celebrate = useCelebrate();
  const { level: batteryLevel } = useTodayBattery();

  // Template items whose text isn't already present as a task
  const pendingTemplate = useMemo(() => {
    const existing = new Set(tasks.map((t) => t.task_text.trim().toLowerCase()));
    return templateItems.filter((i) => !existing.has(i.text.trim().toLowerCase()));
  }, [tasks, templateItems]);

  const total = tasks.length + pendingTemplate.length;
  const done = tasks.filter((t) => t.status === 'done').length;

  // Fire the "bare minimum all done" celebration exactly once per session when
  // the count transitions to complete. Low-battery days get the extra-warm copy.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (tasks.length > 0 && done === tasks.length && pendingTemplate.length === 0) {
      if (!celebratedRef.current) {
        celebratedRef.current = true;
        const lowDay = batteryLevel === 'low' || batteryLevel === 'empty';
        celebrate(lowDay ? 'bare_minimum_all_low_battery' : 'bare_minimum_all');
      }
    } else {
      celebratedRef.current = false;
    }
  }, [tasks.length, done, pendingTemplate.length, batteryLevel, celebrate]);

  if (total === 0) return null;

  const handleTaskToggle = async (taskId: string, currentDone: boolean) => {
    if (!user) return;
    const nextStatus = currentDone ? 'scheduled' : 'done';
    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus, completed_at: nextStatus === 'done' ? new Date().toISOString() : null })
      .eq('task_id', taskId)
      .eq('user_id', user.id);
    if (error) {
      toast.error("Couldn't update that. Try again.");
      return;
    }
    qc.invalidateQueries({ queryKey: ['bare-minimum-tasks'] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <Card className={cn('border-primary/20 bg-primary/[0.03]', className)}>
      <CardContent className={cn('space-y-3', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BatteryLow className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Today's bare minimum</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {done}/{total}
          </span>
        </div>

        {!compact && (
          <OnceHint hintKey="bare-minimum-intro">
            The tiny list that makes the day count — even on your hardest day.
          </OnceHint>
        )}

        {!compact && (
          <p className="text-xs text-muted-foreground">
            The tiny things that make today count. Doing these is a full day.
          </p>
        )}

        <ul className="space-y-1.5">
          {tasks.map((t) => {
            const isDone = t.status === 'done';
            return (
              <li key={t.task_id} className="flex items-center gap-2">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => handleTaskToggle(t.task_id, isDone)}
                  aria-label={`Mark "${t.task_text}" as done`}
                />
                <span className={cn('flex-1 text-sm', isDone && 'line-through text-muted-foreground')}>
                  {t.task_text}
                </span>
                <EnergyChip energy={t.energy_cost} compact />
                {!compact && (
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => toggleBM.mutate({ taskId: t.task_id, value: false })}
                    title="Remove from bare minimum"
                  >
                    unpin
                  </button>
                )}
              </li>
            );
          })}

          {pendingTemplate.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-dashed border-muted-foreground/40" aria-hidden />
              <span className="flex-1 text-sm text-muted-foreground italic">
                {item.text}
              </span>
              <EnergyChip energy={item.energy_cost} compact />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => addTemplate.mutate({ item, dateISO })}
                disabled={addTemplate.isPending}
              >
                <Plus className="h-3 w-3 mr-0.5" />
                Add
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
