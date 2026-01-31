import { Layout } from '@/components/Layout';
import { LaunchWizardV2 } from '@/components/wizards/launch-v2';

export default function LaunchWizardV2Page() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <LaunchWizardV2 />
      </div>
    </Layout>
  );
}
