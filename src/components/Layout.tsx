import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useAllCycles } from '@/hooks/useActiveCycle';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { QuickCaptureButton } from '@/components/quick-capture';
import { SmartActionButton } from '@/components/SmartActionButton';
import { TrialBanner, TrialExpiredScreen } from '@/components/trial';
import { CoinCounter, PetWidget, PomodoroMiniWidget, ArcadeDrawer } from '@/components/arcade';
import { useArcade } from '@/hooks/useArcade';
import { OfflineDetector } from '@/components/OfflineDetector';
import { Loader2, Sparkles, ArrowRight, X } from 'lucide-react';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const trialStatus = useTrialStatus();
  const { data: cycles, isLoading: cyclesLoading } = useAllCycles();
  const { settings, isLoading: arcadeLoading } = useArcade();
  const [forceShow, setForceShow] = useState(false);
  const [dismissedPlanBanner, setDismissedPlanBanner] = useState(false);
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const [arcadeDefaultTab, setArcadeDefaultTab] = useState('games');
  useTheme();

  const hasNoPlan = !cyclesLoading && user && (!cycles || cycles.length === 0);

  // Timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => setForceShow(true), 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Show loading while checking trial status (with timeout fallback)
  if (trialStatus.loading && !forceShow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Show expired screen if trial has ended
  if (!trialStatus.hasAccess && trialStatus.reason === 'trial_expired') {
    return <TrialExpiredScreen expiredAt={trialStatus.expiredAt} />;
  }

  return (
    <>
      <OfflineDetector />
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
        {/* Premium Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Create Your 90-Day Plan Hello Bar */}
          {hasNoPlan && !dismissedPlanBanner && (
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-3 relative">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">Ready to transform your next 90 days?</span>
              <Link 
                to="/cycle-setup" 
                className="inline-flex items-center gap-1.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold transition-colors"
              >
                Create Your 90-Day Plan
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button 
                onClick={() => setDismissedPlanBanner(true)}
                className="absolute right-3 p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Trial Banner */}
          {(trialStatus.reason === 'trial' || trialStatus.reason === 'grace_period') && 
           trialStatus.expiresAt && (
            <TrialBanner 
              expiresAt={trialStatus.expiresAt} 
              isGracePeriod={trialStatus.isGracePeriod}
            />
          )}

          {/* Top Bar */}
          <header className="top-bar">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8" />
            </div>
            {/* Arcade widgets - temporarily hidden for public release */}
            {/* TODO: Re-enable when arcade features are ready
            {!arcadeLoading && settings.arcade_enabled && (
              <div className="flex items-center gap-2 ml-auto">
                {settings.show_pomodoro_widget && (
                  <PomodoroMiniWidget onClick={() => { setArcadeDefaultTab('focus'); setArcadeOpen(true); }} />
                )}
                {settings.show_coin_counter && (
                  <CoinCounter onClick={() => { setArcadeDefaultTab('stats'); setArcadeOpen(true); }} />
                )}
                {settings.show_pet_widget && <PetWidget />}
              </div>
            )}
            */}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        {/* Floating Actions */}
        <SmartActionButton />
        <QuickCaptureButton />
        
        {/* Arcade Drawer */}
        <ArcadeDrawer 
          open={arcadeOpen} 
          onOpenChange={setArcadeOpen} 
          defaultTab={arcadeDefaultTab}
        />
        </div>
      </SidebarProvider>
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return <LayoutContent>{children}</LayoutContent>;
}