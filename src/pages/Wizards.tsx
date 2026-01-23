import { lazy, Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Loader2 } from 'lucide-react';

const WizardHub = lazy(() => import('@/components/wizards/WizardHub'));

export default function Wizards() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Smart Wizards"
          description="Guided workflows to help you plan and execute your business goals"
        />
        
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <WizardHub />
        </Suspense>
      </div>
    </Layout>
  );
}
