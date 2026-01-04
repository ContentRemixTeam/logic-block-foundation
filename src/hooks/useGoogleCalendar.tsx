import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  calendarSelected: boolean;
  calendarName?: string;
  calendarId?: string;
  syncStatus?: string;
  lastSyncAt?: string;
  lastError?: string;
}

export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    connected: false,
    calendarSelected: false,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('google-get-status');
      
      if (error) throw error;
      
      setStatus(data);
    } catch (error) {
      console.error('Error fetching Google Calendar status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Listen for OAuth success message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-oauth-success') {
        setCalendars(event.data.calendars || []);
        setShowCalendarModal(true);
        toast({
          title: 'Connected to Google Calendar',
          description: 'Please select which calendar to sync.',
        });
      } else if (event.data?.type === 'google-oauth-error') {
        toast({
          title: 'Connection failed',
          description: `Error: ${event.data.error}`,
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

  const connect = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        body: { origin: window.location.origin },
      });

      if (error) throw error;

      // Open OAuth popup
      const popup = window.open(
        data.url,
        'google-oauth',
        'width=500,height=600,left=200,top=100'
      );

      if (!popup) {
        toast({
          title: 'Popup blocked',
          description: 'Please allow popups for this site to connect Google Calendar.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting OAuth:', error);
      toast({
        title: 'Failed to connect',
        description: 'Could not start Google Calendar connection.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const selectCalendar = useCallback(async (calendarId: string, calendarName: string) => {
    try {
      const { error } = await supabase.functions.invoke('google-save-calendar-selection', {
        body: { calendarId, calendarName },
      });

      if (error) throw error;

      setShowCalendarModal(false);
      setStatus(prev => ({
        ...prev,
        connected: true,
        calendarSelected: true,
        calendarId,
        calendarName,
        syncStatus: 'active',
      }));

      toast({
        title: 'Calendar selected',
        description: `Syncing with "${calendarName}"`,
      });

      // Trigger initial sync
      syncNow();
    } catch (error) {
      console.error('Error saving calendar selection:', error);
      toast({
        title: 'Failed to save selection',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const disconnect = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('google-disconnect');

      if (error) throw error;

      setStatus({
        connected: false,
        calendarSelected: false,
      });

      toast({
        title: 'Disconnected',
        description: 'Google Calendar has been disconnected.',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Failed to disconnect',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const syncNow = useCallback(async () => {
    try {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke('google-poll-changes');

      if (error) throw error;

      if (data.requiresRetry) {
        // Sync token expired, retry
        const { data: retryData, error: retryError } = await supabase.functions.invoke('google-poll-changes');
        if (retryError) throw retryError;
        
        toast({
          title: 'Sync complete',
          description: `Synced ${retryData.stats.totalFetched} events`,
        });
      } else {
        toast({
          title: 'Sync complete',
          description: `${data.stats.newEvents} new, ${data.stats.updatedEvents} updated, ${data.stats.deletedEvents} removed`,
        });
      }

      await fetchStatus();
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: 'Sync failed',
        description: 'Could not sync with Google Calendar.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  }, [toast, fetchStatus]);

  const pushBlock = useCallback(async (
    blockId: string,
    action: 'create' | 'update' | 'delete',
    eventData?: {
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      timeZone?: string;
    }
  ) => {
    if (!status.connected || !status.calendarSelected) return null;

    try {
      const { data, error } = await supabase.functions.invoke('google-push-block', {
        body: { blockId, action, eventData },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error pushing block to Google:', error);
      toast({
        title: 'Sync failed',
        description: 'Could not sync this time block to Google Calendar.',
        variant: 'destructive',
      });
      return null;
    }
  }, [status.connected, status.calendarSelected, toast]);

  return {
    status,
    loading,
    syncing,
    calendars,
    showCalendarModal,
    setShowCalendarModal,
    connect,
    selectCalendar,
    disconnect,
    syncNow,
    pushBlock,
    refreshStatus: fetchStatus,
  };
}
