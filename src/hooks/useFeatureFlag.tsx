/**
 * Feature Flag Hook
 * Checks if a user has access to a feature (beta rollout support)
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseFeatureFlagResult {
  enabled: boolean;
  loading: boolean;
}

/**
 * Hook to check if a feature flag is enabled for the current user
 * Supports user-specific overrides and percentage-based rollouts
 */
export function useFeatureFlag(key: string): UseFeatureFlagResult {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    const checkFlag = async () => {
      try {
        // Use the RPC function for consistent server-side logic
        const { data, error } = await supabase.rpc('check_feature_flag', {
          p_key: key,
        });

        if (error) {
          console.error('Feature flag check error:', error);
          setEnabled(false);
        } else {
          setEnabled(data === true);
        }
      } catch (error) {
        console.error('Feature flag check failed:', error);
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFlag();
  }, [key, user?.id]);

  return { enabled, loading };
}

/**
 * Simple boolean check for feature flag (for conditional rendering)
 */
export function useIsFeatureEnabled(key: string): boolean {
  const { enabled } = useFeatureFlag(key);
  return enabled;
}
