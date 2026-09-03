import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { LoadingState } from '@/components/system/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { SCORECARD_CAPABILITY, useProductCapabilities } from '@/hooks/useScorecardProduct';

// Live by default after the verified commerce launch. Setting the environment
// variable to "false" is the emergency kill switch.
const SCORECARD_PRODUCT_LIVE = import.meta.env.VITE_ENABLE_SCORECARD_PRODUCT !== 'false';
const PREVIEW_EMAILS = new Set(['faithhawks@gmail.com', 'info@faithmariah.com']);

export function ScorecardGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: capabilities = [], isLoading, isError } = useProductCapabilities();
  const email = (user?.email ?? '').trim().toLowerCase();
  const isPreviewAdmin = PREVIEW_EMAILS.has(email);

  if (isLoading && !isPreviewAdmin) {
    return <LoadingState message="Checking Scorecard access…" />;
  }

  // The environment kill switch preserves Faith's private preview while
  // immediately closing the public product surface.
  if (!SCORECARD_PRODUCT_LIVE) {
    return isPreviewAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
  }

  if (capabilities.includes(SCORECARD_CAPABILITY) || isPreviewAdmin) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-[#F7F5F2] px-5 py-12 font-['DM_Sans'] text-[#111111]">
      <section className="mx-auto max-w-md border-2 border-[#111111] bg-white p-7 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-[#C8145E]" />
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#B8891E]">Account access</p>
        <h1 className="font-['Bebas_Neue'] text-4xl leading-none">Your Scorecard Is Locked</h1>
        <p className="mt-4 text-sm leading-6 text-[#4A4A4A]">
          Sign in with the email used at checkout. If that is already this email, contact support and we’ll reconnect your access.
        </p>
      </section>
    </main>
  );
}
