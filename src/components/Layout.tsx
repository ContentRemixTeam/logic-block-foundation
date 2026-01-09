import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { QuickCaptureButton } from '@/components/quick-capture';
import { SmartActionButton } from '@/components/SmartActionButton';
import { TrialBanner, TrialExpiredScreen } from '@/components/trial';
import { Loader2 } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const trialStatus = useTrialStatus();
  useTheme();

  // Show loading while checking trial status
  if (trialStatus.loading) {
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Premium Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
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
      </div>
    </SidebarProvider>
  );
}