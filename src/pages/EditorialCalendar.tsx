import { Suspense, lazy } from 'react';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { Loader2, CalendarDays } from 'lucide-react';

// Lazy load the heavy calendar view to isolate module loading issues
const EditorialCalendarView = lazy(() => 
  import('@/components/editorial-calendar/EditorialCalendarView').then(mod => ({ default: mod.EditorialCalendarView }))
);

function CalendarLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Loading your calendar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Preparing your content schedule…</p>
        </div>
      </div>
    </div>
  );
}

export default function EditorialCalendar() {
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        {/* Refined page header */}
        <div className="px-6 py-5 border-b border-border/60 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Editorial Calendar
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plan, create & publish your content
              </p>
            </div>
          </div>
        </div>
        <ErrorBoundary>
          <Suspense fallback={<CalendarLoadingFallback />}>
            <EditorialCalendarView />
          </Suspense>
        </ErrorBoundary>
      </div>
    </Layout>
  );
}
