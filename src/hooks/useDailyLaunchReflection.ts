import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveLaunches, ActiveLaunch } from '@/hooks/useActiveLaunches';
import { format } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

export interface DailyLaunchReflection {
  id: string;
  user_id: string;
  launch_id: string;
  date: string;
  phase: string;
  what_worked: string[];
  what_didnt_work: string[];
  quick_note: string | null;
  energy_level: number | null;
  offers_made: number;
  sales_today: number;
  revenue_today: number;
  created_at: string;
  updated_at: string;
}

export interface CompiledLaunchInsights {
  totalEntries: number;
  allWhatWorked: string[];
  allWhatDidntWork: string[];
  averageEnergy: number | null;
  totalOffers: number;
  totalSales: number;
  totalRevenue: number;
  entriesByDate: DailyLaunchReflection[];
}

// Normalize JSONB array from Supabase
const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  return [];
};

// Transform raw DB row to typed reflection
const transformReflection = (row: any): DailyLaunchReflection => ({
  id: row.id,
  user_id: row.user_id,
  launch_id: row.launch_id,
  date: row.date,
  phase: row.phase,
  what_worked: normalizeStringArray(row.what_worked),
  what_didnt_work: normalizeStringArray(row.what_didnt_work),
  quick_note: row.quick_note,
  energy_level: row.energy_level,
  offers_made: row.offers_made ?? 0,
  sales_today: row.sales_today ?? 0,
  revenue_today: row.revenue_today ?? 0,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

interface UseDailyLaunchReflectionOptions {
  date?: string; // Defaults to today
  launchId?: string; // Optional specific launch ID, otherwise uses first active
}

export function useDailyLaunchReflection(options: UseDailyLaunchReflectionOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: activeLaunches = [] } = useActiveLaunches();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const targetDate = options.date || today;
  
  // Get the active launch (first one if multiple)
  const activeLaunch = options.launchId 
    ? activeLaunches.find(l => l.id === options.launchId)
    : activeLaunches[0];

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<Partial<DailyLaunchReflection> | null>(null);

  // Fetch today's reflection for the active launch
  const { data: reflection, isLoading, refetch } = useQuery({
    queryKey: ['daily-launch-reflection', user?.id, activeLaunch?.id, targetDate],
    queryFn: async (): Promise<DailyLaunchReflection | null> => {
      if (!user?.id || !activeLaunch?.id) return null;

      const { data, error } = await supabase
        .from('daily_launch_reflections')
        .select('*')
        .eq('user_id', user.id)
        .eq('launch_id', activeLaunch.id)
        .eq('date', targetDate)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return transformReflection(data);
    },
    enabled: !!user?.id && !!activeLaunch?.id,
    staleTime: 30_000,
  });

  // Create or update reflection
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DailyLaunchReflection>) => {
      if (!user?.id || !activeLaunch?.id) throw new Error('No user or launch');

      const phase = activeLaunch.phase === 'live' ? 'live' : 
                    activeLaunch.phase === 'closed' ? 'post-launch' : 'pre-launch';

      const upsertData = {
        user_id: user.id,
        launch_id: activeLaunch.id,
        date: targetDate,
        phase,
        what_worked: (data.what_worked || []) as unknown as Json,
        what_didnt_work: (data.what_didnt_work || []) as unknown as Json,
        quick_note: data.quick_note ?? null,
        energy_level: data.energy_level ?? null,
        offers_made: data.offers_made ?? 0,
        sales_today: data.sales_today ?? 0,
        revenue_today: data.revenue_today ?? 0,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('daily_launch_reflections')
        .upsert(upsertData, { 
          onConflict: 'user_id,launch_id,date',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['daily-launch-reflection', user?.id, activeLaunch?.id, targetDate] 
      });
    },
  });

  // Debounced save function
  const saveReflection = useCallback((data: Partial<DailyLaunchReflection>) => {
    pendingDataRef.current = { ...pendingDataRef.current, ...data };
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        saveMutation.mutate(pendingDataRef.current);
        pendingDataRef.current = null;
      }
    }, 800);
  }, [saveMutation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Save any pending data immediately
        if (pendingDataRef.current) {
          saveMutation.mutate(pendingDataRef.current);
        }
      }
    };
  }, []);

  // Helper functions for list management
  const addWhatWorked = useCallback((item: string) => {
    if (!item.trim()) return;
    const current = reflection?.what_worked || [];
    saveReflection({ what_worked: [...current, item.trim()] });
  }, [reflection, saveReflection]);

  const addWhatDidntWork = useCallback((item: string) => {
    if (!item.trim()) return;
    const current = reflection?.what_didnt_work || [];
    saveReflection({ what_didnt_work: [...current, item.trim()] });
  }, [reflection, saveReflection]);

  const removeWhatWorked = useCallback((index: number) => {
    const current = reflection?.what_worked || [];
    saveReflection({ what_worked: current.filter((_, i) => i !== index) });
  }, [reflection, saveReflection]);

  const removeWhatDidntWork = useCallback((index: number) => {
    const current = reflection?.what_didnt_work || [];
    saveReflection({ what_didnt_work: current.filter((_, i) => i !== index) });
  }, [reflection, saveReflection]);

  const updateQuickNote = useCallback((note: string) => {
    saveReflection({ quick_note: note });
  }, [saveReflection]);

  const updateEnergyLevel = useCallback((level: number) => {
    saveReflection({ energy_level: level });
  }, [saveReflection]);

  const updateMetrics = useCallback((metrics: { offers_made?: number; sales_today?: number; revenue_today?: number }) => {
    saveReflection(metrics);
  }, [saveReflection]);

  return {
    reflection,
    activeLaunch,
    isLoading,
    isSaving: saveMutation.isPending,
    saveReflection,
    addWhatWorked,
    addWhatDidntWork,
    removeWhatWorked,
    removeWhatDidntWork,
    updateQuickNote,
    updateEnergyLevel,
    updateMetrics,
    refetch,
  };
}

// Hook to get all daily reflections for a launch (for debrief compilation)
export function useLaunchReflectionsCompiled(launchId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['launch-reflections-compiled', user?.id, launchId],
    queryFn: async (): Promise<CompiledLaunchInsights | null> => {
      if (!user?.id || !launchId) return null;

      const { data, error } = await supabase
        .from('daily_launch_reflections')
        .select('*')
        .eq('user_id', user.id)
        .eq('launch_id', launchId)
        .order('date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const entries = data.map(transformReflection);
      
      // Compile insights
      const allWhatWorked = entries.flatMap(e => e.what_worked);
      const allWhatDidntWork = entries.flatMap(e => e.what_didnt_work);
      
      const energyEntries = entries.filter(e => e.energy_level !== null);
      const averageEnergy = energyEntries.length > 0
        ? energyEntries.reduce((sum, e) => sum + (e.energy_level || 0), 0) / energyEntries.length
        : null;

      const totalOffers = entries.reduce((sum, e) => sum + e.offers_made, 0);
      const totalSales = entries.reduce((sum, e) => sum + e.sales_today, 0);
      const totalRevenue = entries.reduce((sum, e) => sum + e.revenue_today, 0);

      return {
        totalEntries: entries.length,
        allWhatWorked,
        allWhatDidntWork,
        averageEnergy,
        totalOffers,
        totalSales,
        totalRevenue,
        entriesByDate: entries,
      };
    },
    enabled: !!user?.id && !!launchId,
    staleTime: 60_000,
  });
}
