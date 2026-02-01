import { Layout } from '@/components/Layout';
import { ContentPlannerWizard } from '@/components/wizards/content-planner';

export default function ContentPlannerPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <ContentPlannerWizard />
      </div>
    </Layout>
  );
}
