import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PlannerSheetStatus {
  connected: boolean;
  storage_mode: 'supabase' | 'sheets_shadow' | 'sheets_primary';
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  schema_version: number | null;
  is_healthy: boolean;
  last_verified_at: string | null;
  last_snapshot_at: string | null;
  last_error: string | null;
  setup_completed_at: string | null;
  can_set_sheets_primary: boolean;
}

const defaultStatus: PlannerSheetStatus = {
  connected: false,
  storage_mode: 'supabase',
  spreadsheet_id: null,
  spreadsheet_url: null,
  schema_version: null,
  is_healthy: false,
  last_verified_at: null,
  last_snapshot_at: null,
  last_error: null,
  setup_completed_at: null,
  can_set_sheets_primary: false,
};

async function invokePlannerSheetSetup(
  action: 'status' | 'setup' | 'set_mode',
  storageMode?: PlannerSheetStatus['storage_mode'],
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please log in first.');

  const { data, error } = await supabase.functions.invoke('planner-sheet-setup', {
    body: { action, storage_mode: storageMode },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  if (data?.error) {
    const err = new Error(data.error) as Error & { needsGoogleConnection?: boolean };
    err.needsGoogleConnection = data.needsGoogleConnection;
    throw err;
  }

  return data;
}

export function usePlannerSheetSetup() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PlannerSheetStatus>(defaultStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(defaultStatus);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await invokePlannerSheetSetup('status');
      setStatus({ ...defaultStatus, ...data });
    } catch (error) {
      console.error('[PlannerSheetSetup] Status error:', error);
      toast.error('Could not check planner storage status');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setup = useCallback(async () => {
    if (!user || isSettingUp) return;

    try {
      setIsSettingUp(true);
      const data = await invokePlannerSheetSetup('setup');
      setStatus(prev => ({ ...prev, ...data, connected: true }));
      toast.success(data?.reused ? 'Planner Sheet verified' : 'Planner Sheet created');
      return data;
    } catch (error: any) {
      console.error('[PlannerSheetSetup] Setup error:', error);
      toast.error(error?.message || 'Could not set up planner Sheet');
      throw error;
    } finally {
      setIsSettingUp(false);
    }
  }, [user, isSettingUp]);

  const setMode = useCallback(async (storageMode: PlannerSheetStatus['storage_mode']) => {
    if (!user) return;

    try {
      const data = await invokePlannerSheetSetup('set_mode', storageMode);
      setStatus({ ...defaultStatus, ...data });
      toast.success(storageMode === 'sheets_primary' ? 'Sheets primary is on' : 'Storage mode updated');
      return data;
    } catch (error: any) {
      console.error('[PlannerSheetSetup] Storage mode error:', error);
      toast.error(error?.message || 'Could not update planner storage mode');
      throw error;
    }
  }, [user]);

  return {
    status,
    isLoading,
    isSettingUp,
    refresh,
    setup,
    setMode,
  };
}
