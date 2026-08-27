import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MembershipContextType {
  isMastermind: boolean;
  membershipTier: string | null;
  membershipStatus: string | null;
  canUsePlanner: boolean;
  canUseMastermind: boolean;
  canUseMastermindAI: boolean;
  canUseReplayVault: boolean;
  capabilities: MemberCapabilities;
  loading: boolean;
  refreshMembership: () => Promise<void>;
}

export interface MemberCapabilities {
  plannerCore: boolean;
  mastermindCore: boolean;
  mastermindAI: boolean;
  replayVault: boolean;
}

const DEFAULT_CAPABILITIES: MemberCapabilities = {
  plannerCore: false,
  mastermindCore: false,
  mastermindAI: false,
  replayVault: false,
};

function tierHasReplayVaultAccess(tier: string | null | undefined) {
  const normalized = tier?.toLowerCase() || '';
  return normalized.includes('annual') || normalized.includes('lifetime') || normalized.includes('vault');
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMastermind, setIsMastermind] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<MemberCapabilities>(DEFAULT_CAPABILITIES);
  const [loading, setLoading] = useState(true);

  const checkMembership = useCallback(async () => {
    if (!user?.email) {
      setIsMastermind(false);
      setMembershipTier(null);
      setMembershipStatus(null);
      setCapabilities(DEFAULT_CAPABILITIES);
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('membership_tier, membership_status')
        .eq('id', user.id)
        .maybeSingle();

      // Check entitlement using the security definer function
      const { data: hasEntitlement, error: entitlementError } = await supabase
        .rpc('check_mastermind_entitlement', { user_email: user.email });

      if (entitlementError) {
        console.error('Error checking entitlement:', entitlementError);
      }

      const isMastermindMember = hasEntitlement === true;
      setIsMastermind(isMastermindMember);

      if (isMastermindMember) {
        const tier = profile?.membership_tier || 'mastermind';
        const status = 'active';

        setMembershipTier(tier);
        setMembershipStatus(status);
        setCapabilities({
          plannerCore: true,
          mastermindCore: true,
          mastermindAI: true,
          replayVault: tierHasReplayVaultAccess(tier),
        });

        // Upsert profile with membership info (including user_type for trial upgrades)
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .update({
            membership_tier: tier,
            membership_status: status,
            user_type: 'member'
          })
          .eq('id', user.id);

        if (upsertError) {
          console.error('Error updating profile membership:', upsertError);
        }
      } else {
        // Check if they had membership before but it expired
        if (profile?.membership_tier === 'mastermind' && profile?.membership_status === 'active') {
          // Membership expired, update profile
          await supabase
            .from('user_profiles')
            .update({
              membership_status: 'expired'
            })
            .eq('id', user.id);
        }

        setMembershipTier(profile?.membership_tier || null);
        setMembershipStatus(profile?.membership_status || null);
        setCapabilities({
          plannerCore: true,
          mastermindCore: false,
          mastermindAI: false,
          replayVault: false,
        });
      }
    } catch (error) {
      console.error('Error checking membership:', error);
      setCapabilities({
        plannerCore: true,
        mastermindCore: false,
        mastermindAI: false,
        replayVault: false,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id]);

  useEffect(() => {
    checkMembership();
  }, [checkMembership]);

  const refreshMembership = useCallback(async () => {
    setLoading(true);
    await checkMembership();
  }, [checkMembership]);

  return (
    <MembershipContext.Provider value={{ 
      isMastermind, 
      membershipTier, 
      membershipStatus, 
      canUsePlanner: capabilities.plannerCore,
      canUseMastermind: capabilities.mastermindCore,
      canUseMastermindAI: capabilities.mastermindAI,
      canUseReplayVault: capabilities.replayVault,
      capabilities,
      loading,
      refreshMembership 
    }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
}
