import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type TrialReason = 'member' | 'admin' | 'trial' | 'grace_period' | 'trial_expired' | 'no_profile' | 'no_trial';

export interface TrialStatus {
  hasAccess: boolean;
  reason: TrialReason;
  expiresAt?: Date;
  expiredAt?: Date;
  isGracePeriod?: boolean;
  userType?: string;
  loading: boolean;
}

const GRACE_PERIOD_HOURS = 24;

export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<TrialStatus>({
    hasAccess: true,
    reason: 'member',
    loading: true,
  });

  const checkTrialStatus = useCallback(async () => {
    if (!user) {
      setStatus({
        hasAccess: false,
        reason: 'no_profile',
        loading: false,
      });
      return;
    }

    try {
      // CRITICAL FIX: Check mastermind entitlement FIRST
      const { data: hasEntitlement } = await supabase
        .rpc('check_mastermind_entitlement', { user_email: user.email });

      // If they have mastermind entitlement, they're a member - period.
      if (hasEntitlement === true) {
        setStatus({
          hasAccess: true,
          reason: 'member',
          userType: 'member',
          loading: false,
          // CRITICAL: Don't set expiresAt for members
        });
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('user_type, trial_expires_at, membership_status, membership_tier')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        // Profile might not exist yet for new users
        setStatus({
          hasAccess: true,
          reason: 'trial',
          loading: false,
        });
        return;
      }

      // Members and admins always have access - no trial logic needed
      // Check multiple indicators: user_type, membership_status, or membership_tier
      const isActiveMember = 
        profile.user_type === 'member' || 
        profile.user_type === 'admin' ||
        profile.membership_status === 'active' ||
        profile.membership_tier === 'mastermind';
        
      if (isActiveMember) {
        setStatus({
          hasAccess: true,
          reason: profile.user_type === 'admin' ? 'admin' : 'member',
          userType: profile.user_type,
          // Don't set expiresAt for members - they shouldn't see trial banner
          loading: false,
        });
        return;
      }

      // Check if trial is still active
      if (profile.user_type === 'guest' && profile.trial_expires_at) {
        const trialExpires = new Date(profile.trial_expires_at);
        const now = new Date();

        // Calculate grace period end
        const graceEndTime = new Date(trialExpires);
        graceEndTime.setHours(graceEndTime.getHours() + GRACE_PERIOD_HOURS);

        if (now < trialExpires) {
          // Trial is still active
          setStatus({
            hasAccess: true,
            reason: 'trial',
            expiresAt: trialExpires,
            userType: profile.user_type,
            loading: false,
          });
        } else if (now < graceEndTime) {
          // In grace period
          setStatus({
            hasAccess: true,
            reason: 'grace_period',
            expiresAt: graceEndTime,
            isGracePeriod: true,
            userType: profile.user_type,
            loading: false,
          });
        } else {
          // Trial expired
          setStatus({
            hasAccess: false,
            reason: 'trial_expired',
            expiredAt: trialExpires,
            userType: profile.user_type,
            loading: false,
          });
        }
        return;
      }

      // No trial set
      setStatus({
        hasAccess: false,
        reason: 'no_trial',
        userType: profile.user_type,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking trial status:', error);
      // Default to allowing access on error to not block users
      setStatus({
        hasAccess: true,
        reason: 'trial',
        loading: false,
      });
    }
  }, [user]);

  useEffect(() => {
    checkTrialStatus();
  }, [checkTrialStatus]);

  // Refresh status periodically (every minute)
  useEffect(() => {
    const interval = setInterval(checkTrialStatus, 60000);
    return () => clearInterval(interval);
  }, [checkTrialStatus]);

  return status;
}
