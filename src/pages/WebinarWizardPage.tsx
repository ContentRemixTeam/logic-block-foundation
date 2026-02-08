import { lazy, Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Loader2 } from 'lucide-react';

const WebinarWizard = lazy(() => import('@/components/wizards/webinar'));

export default function WebinarWizardPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Webinar/Masterclass Planner"
          description="Plan your live event from registration to follow-up"
        />
        
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <WebinarWizard />
        </Suspense>
      </div>
    </Layout>
  );
}
