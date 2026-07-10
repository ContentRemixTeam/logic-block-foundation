import type { ReactNode } from 'react';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { FeatureDisabledPage } from '@/components/FeatureDisabledPage';
import type { FeatureKey } from '@/lib/featureRoutes';

interface Props {
  feature: FeatureKey;
  children: ReactNode;
}

/**
 * Renders `children` only when the given feature is enabled for the user.
 * When disabled, shows a calm "turn it on in Settings" page — never a 404.
 *
 * While the user_settings row is still loading we render children optimistically
 * so a first paint doesn't flash the disabled screen for users who have the
 * feature on. Sidebar filtering already hides the entry point for disabled
 * features, so direct-URL users are the only ones who see the disabled page.
 */
export function FeatureGuard({ feature, children }: Props) {
  const { isEnabled, isLoading } = useFeatureToggles();
  if (isLoading) return <>{children}</>;
  if (!isEnabled(feature)) return <FeatureDisabledPage feature={feature} />;
  return <>{children}</>;
}
