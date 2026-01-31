import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ManifestSwitcher dynamically updates the manifest link in the document head
 * based on the current route. This allows us to have two separate PWA apps:
 * - /quick-add routes use the quick-add-manifest.json
 * - All other routes use the main manifest.json
 */
export function ManifestSwitcher() {
  const location = useLocation();

  useEffect(() => {
    const isQuickAddRoute = location.pathname.startsWith('/quick-add');
    const manifestHref = isQuickAddRoute ? '/quick-add-manifest.json' : '/manifest.json';

    // Find existing manifest link or create one
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }

    // Update the href if different
    if (manifestLink.href !== manifestHref) {
      manifestLink.href = manifestHref;
    }

    // Also update apple-mobile-web-app-title for iOS
    let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
    if (appleTitleMeta) {
      appleTitleMeta.content = isQuickAddRoute ? 'Quick Add' : 'Boss Planner';
    }
  }, [location.pathname]);

  return null;
}
