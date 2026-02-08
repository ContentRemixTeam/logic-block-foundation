import { lazy, Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { Loader2 } from 'lucide-react';

const ContentChallengeWizard = lazy(() => import('@/components/wizards/content-challenge/ContentChallengeWizard'));

export default function ContentChallengeWizardPage() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <ContentChallengeWizard />
      </Suspense>
    </Layout>
  );
}
