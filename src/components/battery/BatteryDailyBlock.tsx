/**
 * Composite calm block that renders on the daily plan and dashboard:
 *   - battery chip (opens check-in)
 *   - Low Battery Day toggle
 *   - Bare-minimum section (top of day)
 *
 * Fetches today's daily_plans row directly so callers don't have to thread it.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BatteryHeaderChip } from './BatteryHeaderChip';
import { LowBatteryDayToggle } from './LowBatteryDayToggle';
import { BareMinimumSection } from './BareMinimumSection';

interface Props {
  dateISO?: string;
  compact?: boolean;
}

interface DailyPlanRow {
  low_battery_mode: boolean | null;
  deferred_task_ids: unknown;
}

export function useDailyBatteryState(dateISO: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['daily-plan-battery', user?.id, dateISO] as const;

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_plans')
        .select('low_battery_mode, deferred_task_ids')
        .eq('user_id', user!.id)
        .eq('date', dateISO)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return (data ?? { low_battery_mode: false, deferred_task_ids: [] }) as DailyPlanRow;
    },
  });

  const deferred = Array.isArray(query.data?.deferred_task_ids)
    ? (query.data!.deferred_task_ids as string[])
    : [];

  return {
    lowBatteryMode: !!query.data?.low_battery_mode,
    deferredTaskIds: deferred,
    refetch: () => qc.invalidateQueries({ queryKey: key }),
  };
}

export function BatteryDailyBlock({ dateISO, compact }: Props) {
  const iso = dateISO ?? format(new Date(), 'yyyy-MM-dd');
  const { lowBatteryMode, deferredTaskIds, refetch } = useDailyBatteryState(iso);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <BatteryHeaderChip size={compact ? 'sm' : 'md'} />
        <LowBatteryDayToggle
          dateISO={iso}
          active={lowBatteryMode}
          deferredTaskIds={deferredTaskIds}
          onChanged={refetch}
        />
      </div>
      <BareMinimumSection dateISO={iso} compact={compact} />
    </div>
  );
}
