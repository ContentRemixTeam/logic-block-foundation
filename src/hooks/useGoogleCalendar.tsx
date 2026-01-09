import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logApiError } from '@/lib/errorLogger';

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
  connectedEmail?: string;
}

export interface OAuthDebugInfo {
  flowType: 'edge-function';
  currentOrigin: string;
  redirectUri: string;
  lastError?: string;
  lastOAuthParams?: Record<string, string>;
}

// Store last OAuth error for debugging
let lastOAuthError: string | null = null;
let lastOAuthParams: Record<string, string> = {};

export function getOAuthDebugInfo(): OAuthDebugInfo {
  return {
    flowType: 'edge-function',
    currentOrigin: window.location.origin,
    redirectUri: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`,
    lastError: lastOAuthError || undefined,
    lastOAuthParams,
  };
}

export function useGoogleCalendar() {
  const [status, setStatus] = useState<GoogleCalendarStatus>({
    connected: false,
    calendarSelected: false,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const { toast } = useToast();
  
  // Ref to prevent handleOAuthReturn from running multiple times
  const oauthProcessedRef = useRef(false);

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

  // Handle OAuth return from redirect flow
  const handleOAuthReturn = useCallback(() => {
    // Prevent multiple executions
    if (oauthProcessedRef.current) return;
    
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const calendarsParam = params.get('calendars');
    const errorParam = params.get('error');
    const emailParam = params.get('email');
    
    // Only process if there are OAuth params
    if (!oauthStatus) return;
    
    // Mark as processed
    oauthProcessedRef.current = true;
    
    // Store params for debugging
    lastOAuthParams = Object.fromEntries(params.entries());
    
    if (oauthStatus === 'success' && calendarsParam) {
      try {
        const calendarsData = JSON.parse(decodeURIComponent(calendarsParam));
        setCalendars(calendarsData);
        setShowCalendarModal(true);
        
        // Update status with email if provided
        if (emailParam) {
          setStatus(prev => ({ ...prev, connectedEmail: decodeURIComponent(emailParam) }));
        }
        
        toast({
          title: '✅ Connected to Google Calendar',
          description: 'Please select which calendar to sync.',
        });
        
        lastOAuthError = null;
      } catch (e) {
        console.error('Error parsing calendars:', e);
        lastOAuthError = 'Failed to parse calendar data';
        toast({
          title: 'Connection issue',
          description: 'Connected but could not load calendars. Please try again.',
          variant: 'destructive',
        });
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthStatus === 'error') {
      // Decode and format error message
      const rawError = errorParam || 'Unknown error';
      const friendlyError = rawError
        .replace(/_/g, ' ')
        .replace(/\+/g, ' ');
      
      lastOAuthError = friendlyError;
      
      toast({
        title: 'Connection failed',
        description: `${friendlyError}. Please try connecting again.`,
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  const connect = useCallback(async (returnPath?: string) => {
    try {
      setConnecting(true);
      
      console.log('[GoogleCalendar] Starting OAuth from origin:', window.location.origin);
      
      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        body: { 
          origin: window.location.origin,
          returnPath: returnPath || window.location.pathname
        },
      });

      if (error) {
        console.error('[GoogleCalendar] OAuth start error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No OAuth URL returned');
      }

      console.log('[GoogleCalendar] Redirecting to Google OAuth...');
      console.log('[GoogleCalendar] Debug info:', data.debug);
      
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error: any) {
      console.error('[GoogleCalendar] Error starting OAuth:', error);
      lastOAuthError = error?.message || 'Failed to start connection';
      toast({
        title: 'Failed to connect',
        description: error?.message || 'Could not start Google Calendar connection.',
        variant: 'destructive',
      });
      setConnecting(false);
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

      if (error) {
        // Log the error for admin visibility
        await logApiError('google-poll-changes', error, { action: 'sync' });
        throw error;
      }

      if (data.requiresRetry) {
        // Sync token expired, retry
        const { data: retryData, error: retryError } = await supabase.functions.invoke('google-poll-changes');
        if (retryError) {
          await logApiError('google-poll-changes', retryError, { action: 'sync-retry' });
          throw retryError;
        }
        
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
    } catch (error: any) {
      console.error('Error syncing:', error);
      // Log to backend for admin visibility
      await logApiError('google-poll-changes', error, { action: 'sync-failed' });
      toast({
        title: 'Sync failed',
        description: error?.message || 'Could not sync with Google Calendar.',
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
    connecting,
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
    handleOAuthReturn,
  };
}
