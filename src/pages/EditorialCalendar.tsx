import { Layout } from '@/components/Layout';
import { EditorialCalendarView } from '@/components/editorial-calendar';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';

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
          <EditorialCalendarView />
        </ErrorBoundary>
      </div>
    </Layout>
  );
}
