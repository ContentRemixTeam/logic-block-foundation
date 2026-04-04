import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const SYNCABLE_TABLES = [
  { key: 'tasks', label: 'Tasks', description: 'All your tasks and to-dos' },
  { key: 'cycles', label: '90-Day Cycles', description: 'Cycle goals and settings' },
  { key: 'daily_plans', label: 'Daily Plans', description: 'Daily priorities, brain dumps, reflections' },
  { key: 'weekly_plans', label: 'Weekly Plans', description: 'Weekly priorities and thoughts' },
  { key: 'habits', label: 'Habits', description: 'Habit definitions' },
  { key: 'habit_logs', label: 'Habit Logs', description: 'Daily habit completions' },
  { key: 'coaching_entries', label: 'Coaching Entries', description: 'Thought work and coaching models' },
  { key: 'beliefs', label: 'Beliefs', description: 'Belief upgrades and evidence' },
  { key: 'ideas', label: 'Ideas', description: 'Your idea bank' },
  { key: 'sops', label: 'SOPs', description: 'Standard operating procedures' },
  { key: 'projects', label: 'Projects', description: 'Project tracking' },
  { key: 'content_items', label: 'Content Items', description: 'Content calendar items' },
  { key: 'weekly_reviews', label: 'Weekly Reviews', description: 'Weekly debrief responses' },
  { key: 'monthly_reviews', label: 'Monthly Reviews', description: 'Monthly review responses' },
] as const;

interface SyncConfig {
  id: string;
  user_id: string;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  selected_tables: string[];
  last_synced_at: string | null;
}

export function useGoogleSheetsSync() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!user) {
      setConfig(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('google_sheets_sync')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setConfig(data as SyncConfig | null);
    } catch (err) {
      console.error('[SheetsSync] Error fetching config:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateSelectedTables = useCallback(async (tables: string[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('google_sheets_sync')
        .upsert({
          user_id: user.id,
          selected_tables: tables,
        } as any, { onConflict: 'user_id' });
      if (error) throw error;
      setConfig(prev => prev
        ? { ...prev, selected_tables: tables }
        : { id: '', user_id: user.id, spreadsheet_id: null, spreadsheet_url: null, selected_tables: tables, last_synced_at: null }
      );
    } catch (err) {
      console.error('[SheetsSync] Error updating tables:', err);
      toast.error('Failed to save selection');
    }
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {});
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setConfig(prev => prev ? {
        ...prev,
        spreadsheet_id: data.spreadsheet_id,
        spreadsheet_url: data.spreadsheet_url,
        last_synced_at: new Date().toISOString(),
      } : null);

      toast.success(`Synced ${data.total_rows} rows across ${data.tables_synced} tabs`);
      return data;
    } catch (err: any) {
      console.error('[SheetsSync] Sync error:', err);
      const msg = err?.message || 'Sync failed';
      if (msg.includes('reconnect') || msg.includes('Sheets permissions')) {
        toast.error('Please reconnect Google with Sheets permissions', {
          description: 'Go to Google Calendar settings and reconnect your account.',
        });
      } else {
        toast.error(msg);
      }
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing]);

  return {
    config,
    isLoading,
    isSyncing,
    syncNow,
    updateSelectedTables,
    refetch: fetchConfig,
  };
}
