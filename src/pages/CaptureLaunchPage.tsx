import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuickCapture } from '@/components/quick-capture';
import { Zap, LayoutDashboard } from 'lucide-react';

export default function CaptureLaunchPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isOpen, openQuickCapture, setStayOpenAfterSave } = useQuickCapture();
  const didAutoOpenRef = useRef(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?redirect=/capture', { replace: true });
    }
  }, [user, loading, navigate]);

  // Auto-open quick capture once when page loads (if authenticated)
  useEffect(() => {
    if (user && !loading && !didAutoOpenRef.current && !isOpen) {
      didAutoOpenRef.current = true;
      // Enable stay-open mode for /capture page
      setStayOpenAfterSave(true);
      // Small delay to ensure page is ready
      setTimeout(() => {
        openQuickCapture({ stayOpenAfterSave: true });
      }, 100);
    }
  }, [user, loading, isOpen, openQuickCapture, setStayOpenAfterSave]);

  // Reset the auto-open flag when navigating away
  useEffect(() => {
    return () => {
      didAutoOpenRef.current = false;
    };
  }, []);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If not authenticated, this will redirect (handled by useEffect above)
  if (!user) {
    return null;
  }

  // Fallback UI when modal is closed
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="text-center space-y-8 max-w-sm">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="h-10 w-10 text-primary" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Quick Capture</h1>
          <p className="text-muted-foreground">
            Capture tasks and ideas instantly
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => openQuickCapture({ stayOpenAfterSave: true })}
            size="lg"
            className="w-full h-14 text-lg gap-2"
          >
            <Zap className="h-5 w-5" />
            Open Quick Capture
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="w-full gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌘K</kbd> anytime to capture
        </p>
      </div>
    </div>
  );
}
