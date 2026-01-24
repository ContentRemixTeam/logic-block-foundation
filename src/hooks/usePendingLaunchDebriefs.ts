import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';

interface Launch {
  id: string;
  name: string;
  cart_closes: string;
  revenue_goal: number | null;
  sales_needed: number | null;
  offer_goal: number | null;
  status: string | null;
}

interface PendingLaunchDebriefs {
  pendingDebriefs: Launch[];
  dismissedIds: string[];
  dismissForSession: (launchId: string) => void;
  dismissPermanently: (launchId: string) => Promise<void>;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function usePendingLaunchDebriefs(): PendingLaunchDebriefs {
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const [pendingDebriefs, setPendingDebriefs] = useState<Launch[]>([]);
  const [sessionDismissed, setSessionDismissed] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dismissedIds = (settings?.dismissed_launch_debriefs as string[]) || [];

  const fetchPendingDebriefs = useCallback(async () => {
    if (!user) {
      setPendingDebriefs([]);
      setIsLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get launches where cart has closed and no debrief exists
      const { data: launches, error } = await supabase
        .from('launches')
        .select(`
          id,
          name,
          cart_closes,
          revenue_goal,
          sales_needed,
          offer_goal,
          status
        `)
        .eq('user_id', user.id)
        .lt('cart_closes', today)
        .order('cart_closes', { ascending: false });

      if (error) throw error;

      if (!launches || launches.length === 0) {
        setPendingDebriefs([]);
        setIsLoading(false);
        return;
      }

      // Check which launches already have debriefs
      const { data: debriefs, error: debriefError } = await supabase
        .from('launch_debriefs')
        .select('launch_id')
        .eq('user_id', user.id)
        .in('launch_id', launches.map(l => l.id));

      if (debriefError) throw debriefError;

      const completedLaunchIds = new Set((debriefs || []).map(d => d.launch_id));
      
      // Filter to only pending debriefs (no debrief completed)
      const pending = launches.filter(l => !completedLaunchIds.has(l.id));
      
      setPendingDebriefs(pending);
    } catch (error) {
      console.error('Error fetching pending launch debriefs:', error);
      setPendingDebriefs([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingDebriefs();
  }, [fetchPendingDebriefs]);

  const dismissForSession = useCallback((launchId: string) => {
    setSessionDismissed(prev => [...prev, launchId]);
  }, []);

  const dismissPermanently = useCallback(async (launchId: string) => {
    const currentDismissed = (settings?.dismissed_launch_debriefs as string[]) || [];
    const newDismissed = [...currentDismissed, launchId];
    
    await updateSettings({ dismissed_launch_debriefs: newDismissed });
    setSessionDismissed(prev => [...prev, launchId]);
  }, [settings, updateSettings]);

  // Filter out session-dismissed and permanently-dismissed launches
  const visibleDebriefs = pendingDebriefs.filter(
    l => !sessionDismissed.includes(l.id) && !dismissedIds.includes(l.id)
  );

  return {
    pendingDebriefs: visibleDebriefs,
    dismissedIds,
    dismissForSession,
    dismissPermanently,
    isLoading,
    refetch: fetchPendingDebriefs,
  };
}
