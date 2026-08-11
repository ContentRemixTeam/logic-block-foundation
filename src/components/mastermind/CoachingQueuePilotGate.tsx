import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function CoachingQueuePilotGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setAllowed(false);
      return () => { active = false; };
    }
    void supabase.rpc('is_admin', { check_user_id: user.id }).then(({ data, error }) => {
      if (active) setAllowed(!error && data === true);
    });
    return () => { active = false; };
  }, [user]);

  if (allowed === null) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Checking private pilot access" /></div>;
  }
  if (!allowed) return <Navigate to="/mastermind" replace />;
  return <>{children}</>;
}
