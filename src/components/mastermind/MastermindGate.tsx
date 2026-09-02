import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/system/LoadingState';

const HIDDEN_QA_ALLOWED_EMAILS = new Set(['faithhawks@gmail.com', 'info@faithmariah.com']);

/**
 * Launch gate for the Mastermind portal (/mastermind).
 * Hidden QA is limited to Faith's two approved signed-in accounts while
 * public navigation remains off.
 */
export function MastermindGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const email = (user?.email ?? '').trim().toLowerCase();

  if (loading) return <LoadingState message="Checking Mastermind access..." />;
  if (!user || !HIDDEN_QA_ALLOWED_EMAILS.has(email)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
