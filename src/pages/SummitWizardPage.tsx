import { lazy, Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { Loader2 } from 'lucide-react';

const SummitWizard = lazy(() => import('@/components/wizards/summit/SummitWizard'));

export default function SummitWizardPage() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <SummitWizard />
      </Suspense>
    </Layout>
  );
}
