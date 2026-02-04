import { Suspense, lazy } from 'react';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy load the heavy calendar view to isolate module loading issues
const EditorialCalendarView = lazy(() => 
  import('@/components/editorial-calendar/EditorialCalendarView').then(mod => ({ default: mod.EditorialCalendarView }))
);

function CalendarLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading calendar...</p>
      </div>
    </div>
  );
}

export default function EditorialCalendar() {
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-2xl font-bold">Editorial Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan and schedule your content creation and publishing
          </p>
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
