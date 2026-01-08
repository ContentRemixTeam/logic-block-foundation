import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { QuickCaptureButton } from '@/components/quick-capture';
import { CycleTimeline } from '@/components/CycleTimeline';
import { SmartActionButton } from '@/components/SmartActionButton';

interface CycleData {
  start_date: string;
  end_date: string;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  useTheme(); // Load and apply theme

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const cycleResult = await supabase.functions.invoke('get-current-cycle-or-create');
        
        if (cycleResult.data?.cycle) {
          setCycleData({
            start_date: cycleResult.data.cycle.start_date,
            end_date: cycleResult.data.cycle.end_date,
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Header with sidebar trigger and timeline */}
          <header className="sticky top-0 z-40 border-b bg-background">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">90-Day Planner</h1>
            </div>
            {cycleData && (
              <div className="px-6 pb-3">
                <CycleTimeline 
                  startDate={cycleData.start_date} 
                  endDate={cycleData.end_date} 
                />
              </div>
            )}
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
          </main>
        </div>

        {/* Smart Action Button */}
        <SmartActionButton />

        {/* Global Quick Capture Button */}
        <QuickCaptureButton />
      </div>
    </SidebarProvider>
  );
}
