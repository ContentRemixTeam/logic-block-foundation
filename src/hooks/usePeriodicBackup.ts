import { useEffect, useRef, useCallback } from 'react';
import { saveBackup, cleanupOldBackups } from '@/lib/offlineDb';

interface PeriodicBackupConfig<T> {
  userId: string | null;
  pageType: string;
  pageId: string;
  getData: () => T | null;
  enabled?: boolean;
  /** Backup interval in milliseconds (default: 5 minutes) */
  intervalMs?: number;
  /** Maximum number of backups to keep per user (default: 20) */
  maxBackups?: number;
}

interface PeriodicBackupReturn {
  /** Force a backup immediately */
  backupNow: () => Promise<void>;
  /** Last backup timestamp */
  lastBackupAt: React.MutableRefObject<number | null>;
}

/**
 * Hook for periodic full backups to IndexedDB.
 * 
 * Creates automatic snapshots every 5 minutes (configurable) to provide
 * a safety net for crash recovery. Backups are stored in IndexedDB with
 * automatic cleanup to prevent storage bloat.
 * 
 * Part of the 13-layer data protection system (Prompt 9).
 */
export function usePeriodicBackup<T>({
  userId,
  pageType,
  pageId,
  getData,
  enabled = true,
  intervalMs = 5 * 60 * 1000, // 5 minutes
  maxBackups = 20,
}: PeriodicBackupConfig<T>): PeriodicBackupReturn {
  const getDataRef = useRef(getData);
  const lastBackupAt = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isBackingUpRef = useRef(false);

  // Keep ref updated
  useEffect(() => {
    getDataRef.current = getData;
  }, [getData]);

  const performBackup = useCallback(async () => {
    if (!userId || isBackingUpRef.current) return;
    
    const data = getDataRef.current();
    if (!data) return;

    isBackingUpRef.current = true;

    try {
      await saveBackup(userId, pageType, pageId, data);
      lastBackupAt.current = Date.now();
      console.log(`[PeriodicBackup] Snapshot saved: ${pageType}/${pageId}`);

      // Cleanup old backups periodically (every 5th backup)
      const backupCount = Math.floor((Date.now() / intervalMs) % 5);
      if (backupCount === 0) {
        const deleted = await cleanupOldBackups(userId, maxBackups);
        if (deleted > 0) {
          console.log(`[PeriodicBackup] Cleaned up ${deleted} old backups`);
        }
      }
    } catch (error) {
      console.error('[PeriodicBackup] Backup failed:', error);
    } finally {
      isBackingUpRef.current = false;
    }
  }, [userId, pageType, pageId, intervalMs, maxBackups]);

  // Set up interval
  useEffect(() => {
    if (!enabled || !userId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial backup after 30 seconds (let page settle)
    const initialTimeout = setTimeout(() => {
      performBackup();
    }, 30 * 1000);

    // Then backup every intervalMs
    intervalRef.current = setInterval(() => {
      performBackup();
    }, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, userId, intervalMs, performBackup]);

  // Backup on page visibility change (coming back to page)
  useEffect(() => {
    if (!enabled || !userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only backup if it's been a while since last backup
        const timeSinceLastBackup = lastBackupAt.current 
          ? Date.now() - lastBackupAt.current 
          : intervalMs;
        
        if (timeSinceLastBackup > intervalMs / 2) {
          performBackup();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, userId, intervalMs, performBackup]);

  return {
    backupNow: performBackup,
    lastBackupAt,
  };
}
