import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AdminPreviewGateProps {
  children: ReactNode;
}

type GateState = 'checking' | 'allowed' | 'denied';

const PREVIEW_ALLOWED_EMAILS = new Set(['faithhawks@gmail.com', 'info@faithmariah.com']);

export function AdminPreviewGate({ children }: AdminPreviewGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState('denied');
      return;
    }

    setState('checking');

    // Hidden private-preview allowlist: specific authenticated emails are
    // allowed for the Mastermind QA routes. This intentionally does not fall
    // back to the general admin role while the feature is hidden from members.
    const email = (user.email ?? '').trim().toLowerCase();
    setState(PREVIEW_ALLOWED_EMAILS.has(email) ? 'allowed' : 'denied');
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
