/**
 * Battery check-in — how much energy does the user have today?
 * Backed by `daily_battery_checkins`, one row per user per date.
 *
 * Zero-pressure: check-in is always optional, always overwritable.
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type BatteryLevel = 'full' | 'half' | 'low' | 'empty';

export const BATTERY_LEVELS: { level: BatteryLevel; label: string; emoji: string; blurb: string }[] = [
  { level: 'full', label: 'Full',  emoji: '🔋', blurb: "Ready to move." },
  { level: 'half', label: 'Half',  emoji: '🪫', blurb: "Steady pace." },
  { level: 'low',  label: 'Low',   emoji: '🔻', blurb: "Gentle day." },
  { level: 'empty',label: 'Empty', emoji: '⚪', blurb: "Rest is enough." },
];

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export function useTodayBattery() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const date = todayStr();
  const key = ['battery-checkin', user?.id, date] as const;

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_battery_checkins')
        .select('level, created_at, updated_at')
        .eq('user_id', user!.id)
        .eq('date', date)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return (data ?? null) as { level: BatteryLevel } | null;
    },
  });

  const setLevel = useMutation({
    mutationFn: async (level: BatteryLevel) => {
      if (!user) throw new Error('not signed in');
      const { error } = await supabase
        .from('daily_battery_checkins')
        .upsert(
          { user_id: user.id, date, level, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date' },
        );
      if (error) throw error;
      return level;
    },
    onMutate: async (level) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, { level });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
      toast.error("Couldn't save your check-in. It's okay — try again.");
    },
  });

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('daily_battery_checkins')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date);
    qc.setQueryData(key, null);
  }, [user, date, qc, key]);

  return {
    level: query.data?.level ?? null,
    hasChecked: !!query.data?.level,
    isLoading: query.isLoading,
    setLevel: (l: BatteryLevel) => setLevel.mutateAsync(l),
    clear,
    date,
  };
}
