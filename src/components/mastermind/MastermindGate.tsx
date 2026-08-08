import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Launch gate for the Mastermind portal (/mastermind).
 * Admin-only until Faith says launch. At launch: swap this gate for a
 * member-entitlement check (add a can_view_mastermind_portal RPC +
 * typegen, or check_mastermind_entitlement) and re-add sidebar nav links.
 */
export function MastermindGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [canView, setCanView] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setCanView(false);
        return;
      }
      try {
        const { data } = await supabase.rpc('is_admin', { check_user_id: user.id });
        if (!cancelled) setCanView(!!data);
      } catch {
        if (!cancelled) setCanView(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (canView === null) return null; // gate resolving
  if (!canView) return <Navigate to="/" replace />;
  return <>{children}</>;
}
