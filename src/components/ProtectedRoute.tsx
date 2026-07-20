import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { PlannerSheetSetupGate } from '@/components/google-sheets/PlannerSheetSetupGate';
import { useAccessCheck } from '@/hooks/useAccessCheck';
import { AccessPaywall } from '@/components/access/AccessPaywall';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const access = useAccessCheck();
  const navigate = useNavigate();
  const location = useLocation();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem('auth_redirect', location.pathname);
      navigate('/auth');
    } else if (!loading && user) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading || access.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading your data...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!access.hasAccess) {
    return <AccessPaywall status={access.status as 'revoked' | 'expired' | 'none'} />;
  }

  return (
    <PlannerSheetSetupGate>
      <div className={`transition-opacity duration-150 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </div>
    </PlannerSheetSetupGate>
  );
}

