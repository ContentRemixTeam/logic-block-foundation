import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      // Store intended destination for redirect after login
      sessionStorage.setItem('auth_redirect', location.pathname);
      navigate('/auth');
    } else if (!loading && user) {
      // Small delay for smoother transition
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading your data...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Smooth fade-in transition
  return (
    <div className={`transition-opacity duration-150 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}
