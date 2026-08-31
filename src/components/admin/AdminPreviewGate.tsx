import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminPreviewGateProps {
  children: ReactNode;
}

type GateState = 'checking' | 'allowed' | 'denied';

const PREVIEW_ALLOWED_EMAILS = new Set(['faithhawks@gmail.com', 'info@faithmariah.com']);
const CHECK_TIMEOUT_MS = 8000;

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

    // Hidden private-preview allowlist: specific authenticated emails are
    // allowed without the is_admin RPC; everyone else uses is_admin.
    const email = (user.email ?? '').trim().toLowerCase();
    if (PREVIEW_ALLOWED_EMAILS.has(email)) {
      setState('allowed');
      return;
    }

    // Fail closed on timeout or error instead of hanging on "Checking…".
    const timeout = setTimeout(() => {
      if (active) setState('denied');
    }, CHECK_TIMEOUT_MS);

    void (async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin', { check_user_id: user.id });
        if (!active) return;
        setState(!error && data === true ? 'allowed' : 'denied');
      } catch {
        if (active) setState('denied');
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timeout);
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
