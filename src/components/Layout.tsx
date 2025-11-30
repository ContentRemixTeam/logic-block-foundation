import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { CaptureButton } from '@/components/CaptureButton';
import { Menu } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  useTheme(); // Load and apply theme

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase.functions.invoke('get-ideas');
        if (data?.categories) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, [user]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Header with sidebar trigger */}
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">90-Day Planner</h1>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
          </main>
        </div>

        {/* Global Capture Button */}
        <CaptureButton 
          categories={categories} 
          onIdeaSaved={async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const { data } = await supabase.functions.invoke('get-ideas');
                if (data?.categories) setCategories(data.categories);
              }
            } catch (error) {
              console.error('Error refreshing categories:', error);
            }
          }} 
        />
      </div>
    </SidebarProvider>
  );
}
