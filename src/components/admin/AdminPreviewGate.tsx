import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminPreviewGateProps {
  children: ReactNode;
}

type GateState = 'checking' | 'allowed' | 'denied';

const PREVIEW_EMAIL_ALLOWLIST = new Set([
  'faithhawks@gmail.com',
  'info@faithmariah.com',
]);

export function AdminPreviewGate({ children }: AdminPreviewGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    let active = true;

    if (authLoading) return;
    if (!user) {
      setState('denied');
      return;
    }

    setState('checking');
    const emailAllowed = PREVIEW_EMAIL_ALLOWLIST.has(user.email?.trim().toLowerCase() ?? '');
    if (emailAllowed) {
      setState('allowed');
      return;
    }

    const timeout = window.setTimeout(() => {
      if (active) setState('denied');
    }, 8000);

    void supabase
      .rpc('is_admin', { check_user_id: user.id })
      .then(({ data, error }) => {
        if (!active) return;
        window.clearTimeout(timeout);
        setState(!error && data === true ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (!active) return;
        window.clearTimeout(timeout);
        setState('denied');
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [authLoading, user]);

  if (authLoading || state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking preview access…
        </div>
      </div>
    );
  }

  if (!user || state === 'denied') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
