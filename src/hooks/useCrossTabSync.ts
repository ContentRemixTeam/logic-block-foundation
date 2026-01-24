import { useEffect, useCallback, useRef } from 'react';

interface CrossTabMessage<T = unknown> {
  type: 'data-update' | 'save-complete' | 'conflict-detected' | 'tab-focus';
  key: string;
  data?: T;
  timestamp: number;
  tabId: string;
  version?: string;
}

interface CrossTabSyncConfig {
  /** Unique key for the data being synced (e.g., 'daily-plan-2024-01-24') */
  key: string;
  /** Called when another tab broadcasts an update */
  onRemoteUpdate?: (data: unknown, timestamp: number) => void;
  /** Called when a conflict is detected between tabs */
  onConflict?: (localTimestamp: number, remoteTimestamp: number) => void;
  /** Called when another tab gains focus (useful for refresh hints) */
  onTabFocus?: () => void;
  /** Whether sync is enabled */
  enabled?: boolean;
}

interface CrossTabSyncReturn<T> {
  /** Broadcast a data update to all other tabs */
  broadcast: (data: T) => void;
  /** Broadcast that a save completed successfully */
  broadcastSaveComplete: () => void;
  /** Request other tabs to send their latest data */
  requestSync: () => void;
  /** Unique ID for this tab */
  tabId: string;
}

// Generate a unique tab ID
const generateTabId = (): string => {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// Singleton tab ID for this browser tab
const TAB_ID = generateTabId();

// Channel name prefix
const CHANNEL_PREFIX = 'lovable-sync-';

/**
 * Hook for cross-tab data synchronization using BroadcastChannel API.
 * Enables real-time sync of data changes across multiple open tabs of the same app.
 * 
 * Features:
 * - Broadcasts data updates to all other tabs
 * - Listens for updates from other tabs
 * - Detects and handles conflicts (last-write-wins with notification)
 * - Notifies when other tabs gain focus
 * 
 * @example
 * ```tsx
 * const { broadcast, broadcastSaveComplete } = useCrossTabSync({
 *   key: `daily-plan-${date}`,
 *   onRemoteUpdate: (data) => {
 *     // Another tab updated the data, refresh local state
 *     setLocalData(data);
 *   },
 *   onConflict: () => {
 *     toast.info('Data updated in another tab');
 *   },
 * });
 * 
 * // When local data changes:
 * broadcast(newData);
 * 
 * // When save completes:
 * broadcastSaveComplete();
 * ```
 */
export function useCrossTabSync<T = unknown>({
  key,
  onRemoteUpdate,
  onConflict,
  onTabFocus,
  enabled = true,
}: CrossTabSyncConfig): CrossTabSyncReturn<T> {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastLocalTimestampRef = useRef<number>(0);
  const lastRemoteTimestampRef = useRef<number>(0);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channelName = `${CHANNEL_PREFIX}${key}`;
    
    try {
      const channel = new BroadcastChannel(channelName);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<CrossTabMessage<T>>) => {
        const message = event.data;

        // Ignore messages from this tab
        if (message.tabId === TAB_ID) {
          return;
        }

        switch (message.type) {
          case 'data-update':
            // Check for conflicts
            if (lastLocalTimestampRef.current > 0 && 
                message.timestamp < lastLocalTimestampRef.current) {
              // Remote update is older than local - potential conflict
              onConflict?.(lastLocalTimestampRef.current, message.timestamp);
            } else {
              // Accept remote update
              lastRemoteTimestampRef.current = message.timestamp;
              onRemoteUpdate?.(message.data, message.timestamp);
            }
            break;

          case 'save-complete':
            // Another tab saved successfully
            lastRemoteTimestampRef.current = message.timestamp;
            break;

          case 'conflict-detected':
            onConflict?.(lastLocalTimestampRef.current, message.timestamp);
            break;

          case 'tab-focus':
            onTabFocus?.();
            break;
        }
      };

      channel.onmessageerror = (error) => {
        console.warn('[useCrossTabSync] Message error:', error);
      };

      // Notify other tabs when this tab gains focus
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && channelRef.current) {
          const message: CrossTabMessage = {
            type: 'tab-focus',
            key,
            timestamp: Date.now(),
            tabId: TAB_ID,
          };
          try {
            channelRef.current.postMessage(message);
          } catch {
            // Channel may be closed
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        channel.close();
        channelRef.current = null;
      };
    } catch (error) {
      console.warn('[useCrossTabSync] Failed to create BroadcastChannel:', error);
    }
  }, [key, enabled, onRemoteUpdate, onConflict, onTabFocus]);

  /**
   * Broadcast a data update to all other tabs
   */
  const broadcast = useCallback((data: T) => {
    if (!channelRef.current) return;

    const timestamp = Date.now();
    lastLocalTimestampRef.current = timestamp;

    const message: CrossTabMessage<T> = {
      type: 'data-update',
      key,
      data,
      timestamp,
      tabId: TAB_ID,
      version: '1.0',
    };

    try {
      channelRef.current.postMessage(message);
    } catch (error) {
      console.warn('[useCrossTabSync] Failed to broadcast:', error);
    }
  }, [key]);

  /**
   * Broadcast that a save completed successfully
   */
  const broadcastSaveComplete = useCallback(() => {
    if (!channelRef.current) return;

    const timestamp = Date.now();
    lastLocalTimestampRef.current = timestamp;

    const message: CrossTabMessage = {
      type: 'save-complete',
      key,
      timestamp,
      tabId: TAB_ID,
    };

    try {
      channelRef.current.postMessage(message);
    } catch (error) {
      console.warn('[useCrossTabSync] Failed to broadcast save complete:', error);
    }
  }, [key]);

  /**
   * Request other tabs to send their latest data
   * (Currently just triggers a tab-focus event which prompts refresh)
   */
  const requestSync = useCallback(() => {
    if (!channelRef.current) return;

    const message: CrossTabMessage = {
      type: 'tab-focus',
      key,
      timestamp: Date.now(),
      tabId: TAB_ID,
    };

    try {
      channelRef.current.postMessage(message);
    } catch (error) {
      console.warn('[useCrossTabSync] Failed to request sync:', error);
    }
  }, [key]);

  return {
    broadcast,
    broadcastSaveComplete,
    requestSync,
    tabId: TAB_ID,
  };
}

/**
 * Simple hook to detect if BroadcastChannel is supported
 */
export function useBroadcastChannelSupport(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}
