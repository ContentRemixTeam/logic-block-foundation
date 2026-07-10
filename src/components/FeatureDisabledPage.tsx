import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Layout } from '@/components/Layout';
import type { FeatureKey } from '@/lib/featureRoutes';
import { FEATURE_LIST } from '@/lib/featureRoutes';

interface Props {
  feature: FeatureKey;
}

export function FeatureDisabledPage({ feature }: Props) {
  const meta = FEATURE_LIST.find((f) => f.key === feature);

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6 sm:p-10">
        <Card className="border-dashed">
          <CardContent className="py-10 px-6 text-center space-y-5">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">
                {meta?.label ?? 'This feature'} is turned off
              </h1>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                No pressure — you can turn it on any time in{' '}
                <span className="font-medium text-foreground">
                  Settings → Extra Features
                </span>
                . Your data is safe either way.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button asChild>
                <Link to="/settings#extra-features">Open Settings</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/dashboard">Go home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
