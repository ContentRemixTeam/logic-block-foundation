import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Star, Battery, HelpCircle, X, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOMENTUM_FORWARD } from '@/lib/momentumTypes';
import { pickPrompt } from '@/lib/coachingPrompts';
import { toast } from 'sonner';
import type { Task } from '@/components/tasks/types';

interface BraveMoveSlotsProps {
  /** Date in 'yyyy-MM-dd' for the row being edited (today by default). */
  date: string;
  /** Existing day_id if a plan row already exists. Required for updates. */
  dayId?: string | null;
}

interface SlotsRow {
  brave_move_task_id: string | null;
  low_energy_task_id: string | null;
  support_task_id: string | null;
  not_today: string | null;
}

const QK = (date: string, userId: string | undefined) =>
  ['daily-plan-slots', userId, date] as const;

/**
 * Mastermind OS — Today's anchors at a glance.
 *
 * 4 named slots for the day:
 *   ★ Brave Move    — pick from revenue/audience high-focus tasks
 *   ◐ Low-Energy    — pick from low-energy tasks
 *   ? Support / Ask — pick from waiting / unclear tasks
 *   ✕ Not Today    — free text
 *
 * Persists to daily_plans via direct upsert. Decoupled from page autosave so it
 * never races. Falls back to creating a plan row when one doesn't exist.
 */
export function BraveMoveSlots({ date, dayId }: BraveMoveSlotsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tasks } = useTasks();

  // Load the slot fields for this date
  const { data: row } = useQuery({
    queryKey: QK(date, user?.id),
    enabled: !!user,
    queryFn: async (): Promise<SlotsRow> => {
      const { data, error } = await supabase
        .from('daily_plans')
        .select('brave_move_task_id, low_energy_task_id, support_task_id, not_today')
        .eq('user_id', user!.id)
        .eq('date', date)
        .maybeSingle();
      if (error) throw error;
      return (
        (data as SlotsRow | null) ?? {
          brave_move_task_id: null,
          low_energy_task_id: null,
          support_task_id: null,
          not_today: null,
        }
      );
    },
  });

  const [notToday, setNotToday] = useState(row?.not_today ?? '');

  useEffect(() => {
    setNotToday(row?.not_today ?? '');
  }, [row?.not_today]);

  // Task pools
  const openTasks = useMemo(
    () => tasks.filter((t) => !t.is_completed),
    [tasks],
  );
  const braveCandidates = useMemo(
    () =>
      openTasks
        .filter(
          (t) =>
            (t.momentum_type && MOMENTUM_FORWARD.includes(t.momentum_type as any)) ||
            t.energy_level === 'high_focus',
        )
        .slice(0, 50),
    [openTasks],
  );
  const lowEnergyCandidates = useMemo(
    () =>
      openTasks
        .filter((t) => t.energy_level === 'low_energy' || t.is_maintenance)
        .slice(0, 50),
    [openTasks],
  );
  const supportCandidates = useMemo(
    () =>
      openTasks
        .filter(
          (t) =>
            t.status === 'waiting' ||
            t.reschedule_loop_active ||
            (t.reschedule_count_30d ?? 0) >= 3,
        )
        .slice(0, 50),
    [openTasks],
  );

  const findTask = (id: string | null | undefined): Task | undefined =>
    id ? tasks.find((t) => t.task_id === id) : undefined;

  const writeSlots = async (patch: Partial<SlotsRow>) => {
    if (!user) return;
    // Optimistic
    queryClient.setQueryData<SlotsRow>(QK(date, user.id), (prev) => ({
      brave_move_task_id: prev?.brave_move_task_id ?? null,
      low_energy_task_id: prev?.low_energy_task_id ?? null,
      support_task_id: prev?.support_task_id ?? null,
      not_today: prev?.not_today ?? null,
      ...patch,
    }));

    try {
      if (dayId) {
        const { error } = await supabase
          .from('daily_plans')
          .update(patch)
          .eq('day_id', dayId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_plans')
          .upsert(
            { user_id: user.id, date, ...patch },
            { onConflict: 'user_id,date' },
          );
        if (error) throw error;
      }
    } catch (err) {
      console.error('Failed to save brave move slot', err);
      toast.error('Could not save');
      queryClient.invalidateQueries({ queryKey: QK(date, user.id) });
    }
  };

  const slots: Array<{
    key: keyof SlotsRow;
    icon: React.ReactNode;
    label: string;
    accent: string;
    candidates: Task[];
    placeholderPromptCtx: 'today_no_brave_move' | null;
  }> = [
    {
      key: 'brave_move_task_id',
      icon: <Star className="h-4 w-4" />,
      label: 'Brave Move',
      accent: 'text-warning',
      candidates: braveCandidates,
      placeholderPromptCtx: 'today_no_brave_move',
    },
    {
      key: 'low_energy_task_id',
      icon: <Battery className="h-4 w-4" />,
      label: 'Low-Energy',
      accent: 'text-success',
      candidates: lowEnergyCandidates,
      placeholderPromptCtx: null,
    },
    {
      key: 'support_task_id',
      icon: <HelpCircle className="h-4 w-4" />,
      label: 'Support / Ask',
      accent: 'text-primary',
      candidates: supportCandidates,
      placeholderPromptCtx: null,
    },
  ];

  return (
    <Card className="p-4 space-y-3 border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-warning" />
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Today&apos;s anchors
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {slots.map((slot) => {
          const taskId = (row?.[slot.key] ?? null) as string | null;
          const task = findTask(taskId);
          return (
            <SlotPicker
              key={String(slot.key)}
              icon={slot.icon}
              label={slot.label}
              accent={slot.accent}
              task={task}
              candidates={slot.candidates}
              promptHint={
                slot.placeholderPromptCtx
                  ? pickPrompt(slot.placeholderPromptCtx, date)
                  : null
              }
              onPick={(id) => writeSlots({ [slot.key]: id } as Partial<SlotsRow>)}
              onClear={() =>
                writeSlots({ [slot.key]: null } as Partial<SlotsRow>)
              }
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">
          Not today:
        </span>
        <Input
          value={notToday}
          onChange={(e) => setNotToday(e.target.value)}
          onBlur={() => {
            if (notToday !== (row?.not_today ?? '')) {
              writeSlots({ not_today: notToday || null });
            }
          }}
          placeholder="One thing you're letting go of today…"
          className="h-7 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1"
          maxLength={200}
        />
      </div>
    </Card>
  );
}

function SlotPicker({
  icon,
  label,
  accent,
  task,
  candidates,
  promptHint,
  onPick,
  onClear,
}: {
  icon: React.ReactNode;
  label: string;
  accent: string;
  task: Task | undefined;
  candidates: Task[];
  promptHint: string | null;
  onPick: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group relative w-full text-left rounded-md border bg-background/60 hover:bg-background transition-colors p-2.5 min-h-[68px] flex flex-col gap-1',
          )}
        >
          <div className={cn('flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold', accent)}>
            {icon}
            {label}
          </div>
          {task ? (
            <p className="text-sm leading-snug line-clamp-2">{task.task_text}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              {promptHint ?? `Pick a ${label.toLowerCase()} task…`}
            </p>
          )}
          {task && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              title="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="px-3 py-2 border-b text-xs text-muted-foreground">
          {candidates.length === 0
            ? 'No matching tasks. Add or tag some first.'
            : `Pick a ${label.toLowerCase()} task`}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {candidates.map((t) => (
            <button
              key={t.task_id}
              type="button"
              onClick={() => {
                onPick(t.task_id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-start gap-2"
            >
              {task?.task_id === t.task_id && (
                <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              )}
              <span className="flex-1">{t.task_text}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
