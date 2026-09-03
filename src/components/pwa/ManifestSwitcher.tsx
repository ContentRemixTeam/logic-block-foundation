import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ManifestSwitcher dynamically updates the manifest link in the document head
 * based on the current route. This allows us to have two separate PWA apps:
 * - /quick-add routes use the quick-add-manifest.json
 * - /scorecard routes use the scorecard-manifest.json
 * - All other routes use the main manifest.json
 */
export function ManifestSwitcher() {
  const location = useLocation();

  useEffect(() => {
    const isQuickAddRoute = location.pathname.startsWith('/quick-add');
    const isScorecardRoute = location.pathname.startsWith('/scorecard');
    const manifestHref = isQuickAddRoute
      ? '/quick-add-manifest.json'
      : isScorecardRoute
        ? '/scorecard-manifest.json'
        : '/manifest.json';

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
    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
    if (appleTitleMeta) {
      appleTitleMeta.content = isQuickAddRoute ? 'Quick Add' : isScorecardRoute ? 'My Scorecard' : 'Boss Planner';
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (themeColorMeta) {
      themeColorMeta.content = isScorecardRoute ? '#C8145E' : '#0077b6';
    }
  }, [location.pathname]);

  return null;
}
