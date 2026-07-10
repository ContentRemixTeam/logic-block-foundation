import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { pickDisplayName } from '@/lib/displayName';

/**
 * Returns the user's display name, or null when we don't know one yet.
 *
 * NEVER derives a name from the email address — see `pickDisplayName`
 * for the exact source-of-truth order.
 */
export function useDisplayName(): string | null {
  const { user } = useAuth();

  const { data: profileFirstName } = useQuery({
    queryKey: ['user-profile-first-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();
      return (data?.first_name as string | null) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  return pickDisplayName(
    profileFirstName,
    user?.user_metadata as { first_name?: unknown; full_name?: unknown } | null,
  );
}
