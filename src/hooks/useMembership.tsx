import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MembershipContextType {
  isMastermind: boolean;
  membershipTier: string | null;
  membershipStatus: string | null;
  loading: boolean;
  refreshMembership: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMastermind, setIsMastermind] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkMembership = useCallback(async () => {
    if (!user?.email) {
      setIsMastermind(false);
      setMembershipTier(null);
      setMembershipStatus(null);
      setLoading(false);
      return;
    }

    try {
      // Check entitlement using the security definer function
      const { data: hasEntitlement, error: entitlementError } = await supabase
        .rpc('check_mastermind_entitlement', { user_email: user.email });

      if (entitlementError) {
        console.error('Error checking entitlement:', entitlementError);
      }

      const isMastermindMember = hasEntitlement === true;
      setIsMastermind(isMastermindMember);

      if (isMastermindMember) {
        setMembershipTier('mastermind');
        setMembershipStatus('active');

        // Upsert profile with membership info
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .update({
            membership_tier: 'mastermind',
            membership_status: 'active'
          })
          .eq('id', user.id);

        if (upsertError) {
          console.error('Error updating profile membership:', upsertError);
        }
      } else {
        // Check if they had membership before but it expired
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('membership_tier, membership_status')
          .eq('id', user.id)
          .single();

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
      }
    } catch (error) {
      console.error('Error checking membership:', error);
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
