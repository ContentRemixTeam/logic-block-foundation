import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LaunchDebrief {
  id: string;
  launch_id: string;
  user_id: string;
  actual_revenue: number | null;
  actual_sales: number | null;
  conversion_rate: number | null;
  what_worked: string | null;
  what_to_improve: string | null;
  biggest_win: string | null;
  would_do_differently: string | null;
  energy_rating: number | null;
  will_launch_again: boolean | null;
  notes: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface LaunchWithDetails {
  id: string;
  name: string;
  cart_opens: string | null;
  cart_closes: string;
  revenue_goal: number | null;
  sales_needed: number | null;
  offer_goal: number | null;
  status: string | null;
  debrief?: LaunchDebrief;
}

interface UseLaunchDebriefResult {
  launch: LaunchWithDetails | null;
  debrief: LaunchDebrief | null;
  isLoading: boolean;
  saveDebrief: (data: Partial<LaunchDebrief>) => Promise<boolean>;
  allDebriefs: LaunchDebrief[];
  allLaunches: LaunchWithDetails[];
  fetchAllDebriefs: () => Promise<void>;
}

export function useLaunchDebrief(launchId?: string): UseLaunchDebriefResult {
  const { user } = useAuth();
  const [launch, setLaunch] = useState<LaunchWithDetails | null>(null);
  const [debrief, setDebrief] = useState<LaunchDebrief | null>(null);
  const [allDebriefs, setAllDebriefs] = useState<LaunchDebrief[]>([]);
  const [allLaunches, setAllLaunches] = useState<LaunchWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLaunchData = useCallback(async () => {
    if (!user || !launchId) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch launch details
      const { data: launchData, error: launchError } = await supabase
        .from('launches')
        .select('*')
        .eq('id', launchId)
        .eq('user_id', user.id)
        .single();

      if (launchError) throw launchError;
      setLaunch(launchData);

      // Fetch existing debrief if any
      const { data: debriefData, error: debriefError } = await supabase
        .from('launch_debriefs')
        .select('*')
        .eq('launch_id', launchId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (debriefError) throw debriefError;
      setDebrief(debriefData);
    } catch (error) {
      console.error('Error fetching launch data:', error);
      toast.error('Failed to load launch data');
    } finally {
      setIsLoading(false);
    }
  }, [user, launchId]);

  const fetchAllDebriefs = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all completed launches with their debriefs
      const { data: launches, error: launchError } = await supabase
        .from('launches')
        .select('*')
        .eq('user_id', user.id)
        .lt('cart_closes', new Date().toISOString().split('T')[0])
        .order('cart_closes', { ascending: false });

      if (launchError) throw launchError;

      const { data: debriefs, error: debriefError } = await supabase
        .from('launch_debriefs')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (debriefError) throw debriefError;

      setAllDebriefs(debriefs || []);
      
      // Combine launches with their debriefs
      const launchesWithDebriefs = (launches || []).map(launch => ({
        ...launch,
        debrief: debriefs?.find(d => d.launch_id === launch.id),
      }));
      
      setAllLaunches(launchesWithDebriefs);
    } catch (error) {
      console.error('Error fetching all debriefs:', error);
    }
  }, [user]);

  useEffect(() => {
    if (launchId) {
      fetchLaunchData();
    } else {
      fetchAllDebriefs();
      setIsLoading(false);
    }
  }, [launchId, fetchLaunchData, fetchAllDebriefs]);

  const saveDebrief = useCallback(async (data: Partial<LaunchDebrief>): Promise<boolean> => {
    if (!user || !launchId) return false;

    try {
      if (debrief) {
        // Update existing debrief
        const { error } = await supabase
          .from('launch_debriefs')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', debrief.id);

        if (error) throw error;
      } else {
        // Create new debrief
        const { error } = await supabase
          .from('launch_debriefs')
          .insert({
            launch_id: launchId,
            user_id: user.id,
            ...data,
          });

        if (error) throw error;
      }

      toast.success('Launch debrief saved!');
      await fetchLaunchData();
      return true;
    } catch (error) {
      console.error('Error saving debrief:', error);
      toast.error('Failed to save debrief');
      return false;
    }
  }, [user, launchId, debrief, fetchLaunchData]);

  return {
    launch,
    debrief,
    isLoading,
    saveDebrief,
    allDebriefs,
    allLaunches,
    fetchAllDebriefs,
  };
}
