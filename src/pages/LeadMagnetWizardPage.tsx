import { lazy, Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Loader2 } from 'lucide-react';

const LeadMagnetWizard = lazy(() => import('@/components/wizards/lead-magnet'));

export default function LeadMagnetWizardPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Lead Magnet Creator"
          description="Create a high-converting freebie to grow your email list"
        />
        
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <LeadMagnetWizard />
        </Suspense>
      </div>
    </Layout>
  );
}
