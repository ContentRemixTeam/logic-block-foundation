/**
 * Canonical reader for the user_settings row.
 *
 * All hooks/components that need ANY column from user_settings should call
 * this (optionally with a `select` transformer) so React Query dedupes them
 * onto a single shared cache entry.
 *
 * Why: previously 5+ hooks each opened their own queryKey ('delight-settings',
 * 'calendar-settings', 'arcade-settings', etc.) and refetched the same row
 * with different column subsets on every page load. Same key + 5min staleTime
 * means one network request per ~5 min, not 5+ per navigation.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type UserSettingsRow = Tables<'user_settings'>;

const SHARED_KEY = (uid: string | undefined) => ['user_settings', uid] as const;

async function fetchOrCreate(userId: string): Promise<UserSettingsRow | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[useUserSettingsRow] fetch failed:', error);
    return null;
  }
  if (data) return data as UserSettingsRow;

  // Auto-create with sensible defaults (matches get-user-settings edge fn)
  const { data: created, error: upsertError } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        daily_review_questions: [],
        weekly_review_questions: [],
        monthly_review_questions: [],
        cycle_summary_questions: [],
        theme_preference: 'vibrant',
        xp_points: 0,
        user_level: 1,
        streak_potions_remaining: 2,
        current_debrief_streak: 0,
        longest_debrief_streak: 0,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (upsertError) {
    // Race fallback
    const { data: existing } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return (existing as UserSettingsRow) ?? null;
  }
  return (created as UserSettingsRow) ?? null;
}

/**
 * Returns the full user_settings row. Use the `select` option to derive a
 * slice — React Query will still cache the full row under the shared key so
 * other consumers reuse it.
 */
export function useUserSettingsRow<TSelected = UserSettingsRow | null>(
  selectFn?: (row: UserSettingsRow | null) => TSelected
) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: SHARED_KEY(user?.id),
    queryFn: () => fetchOrCreate(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,        // 5 min — settings change rarely
    gcTime: 30 * 60 * 1000,          // keep in cache for 30 min
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    select: selectFn as ((row: UserSettingsRow | null) => TSelected) | undefined,
  });

  return query;
}

/** Imperative refresh + optimistic patch, for mutation handlers. */
export function useUserSettingsCache() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const patch = useCallback(
    (updates: Partial<UserSettingsRow>) => {
      qc.setQueryData<UserSettingsRow | null>(SHARED_KEY(user?.id), (old) =>
        old ? ({ ...old, ...updates } as UserSettingsRow) : (old ?? null)
      );
    },
    [qc, user?.id]
  );

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: SHARED_KEY(user?.id) });
  }, [qc, user?.id]);

  return { patch, invalidate, key: SHARED_KEY(user?.id) };
}
