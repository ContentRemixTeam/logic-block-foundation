import { useMemo, useState } from 'react';
import type { EngineBuilderData } from './EngineBuilderTypes';
import { FREE_PRODUCTS, VIP_PRODUCTS, type BundleProduct } from './BundleRecommendationData';

interface BundleRecommendationsProps {
  data: EngineBuilderData;
}

// Map engine builder selections → tags
function getRelevantTags(data: EngineBuilderData): string[] {
  const tags: string[] = [];

  const platformMap: Record<string, string[]> = {
    instagram: ['instagram', 'social-media'],
    linkedin: ['linkedin', 'social-media'],
    youtube: ['youtube', 'social-media'],
    pinterest: ['pinterest', 'social-media'],
    'blog-seo': ['blog-seo'],
    podcast: ['podcast'],
    facebook: ['facebook', 'social-media'],
    tiktok: ['tiktok', 'social-media'],
    threads: ['social-media'],
    twitter: ['social-media'],
    'facebook-groups': ['facebook', 'community', 'social-media'],
    substack: ['email', 'blog-seo'],
    medium: ['blog-seo'],
    etsy: ['business-strategy'],
    other: [],
  };
  if (data.primaryPlatform && platformMap[data.primaryPlatform]) {
    tags.push(...platformMap[data.primaryPlatform]);
  }

  if (data.emailMethod) {
    tags.push('email');
    if (data.emailMethod === 'sequence') tags.push('email-launch');
  }

  const nurtureMap: Record<string, string[]> = {
    podcast: ['podcast'],
    youtube: ['youtube'],
    blog: ['blog-seo'],
    community: ['community'],
    none: [],
  };
  if (data.secondaryNurture && nurtureMap[data.secondaryNurture]) {
    tags.push(...nurtureMap[data.secondaryNurture]);
  }

  if (data.freeTransformation) tags.push('lead-magnet');

  data.salesMethods.forEach(m => {
    if (m === 'sales-page') tags.push('sales-page', 'copywriting');
    if (m === 'calls') tags.push('calls');
    if (m === 'webinar') tags.push('webinar');
    if (m === 'email-launch') tags.push('email-launch', 'email');
    if (m === 'checkout-link') tags.push('checkout-link');
    if (m === 'limited-time') tags.push('sales-page');
    if (m === 'challenge-launch') tags.push('webinar', 'email-launch');
  });

  tags.push('business-strategy', 'productivity');

  return [...new Set(tags)];
}

// Focus area boost — products matching the user's focus get extra score
function getFocusBoostTags(focusArea: string): string[] {
  switch (focusArea) {
    case 'discover': return ['social-media', 'instagram', 'linkedin', 'youtube', 'pinterest', 'podcast', 'blog-seo', 'lead-magnet'];
    case 'nurture': return ['email', 'email-launch', 'community', 'podcast'];
    case 'convert': return ['sales-page', 'copywriting', 'webinar', 'checkout-link'];
    default: return [];
  }
}

function scoreProduct(product: BundleProduct, relevantTags: string[], focusBoostTags: string[]): number {
  let score = 0;
  for (const tag of product.tags) {
    if (relevantTags.includes(tag)) score++;
    // Double-score if tag matches focus area
    if (focusBoostTags.includes(tag)) score += 2;
  }
  if (product.isSponsor) {
    score += product.sponsorLevel === 'gold' ? 2 : 1;
  }
  return score;
}

function ProductCard({ product, isVip }: { product: BundleProduct; isVip?: boolean }) {
  if (isVip) {
    // VIP products — NO links, just display
    return (
      <div className="block p-4 rounded-xl border transition-all border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-500/30">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h5 className="font-semibold text-sm text-foreground leading-tight">{product.giftName}</h5>
          <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
            {product.value}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">by {product.name}</span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            👑 Boss Mode
          </span>
        </div>
      </div>
    );
  }

  // Free products — clickable links
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-xl border border-border bg-card transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h5 className="font-semibold text-sm text-foreground leading-tight">{product.giftName}</h5>
        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {product.value}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">by {product.name}</span>
        <span className="text-xs font-semibold text-primary">Get It Free →</span>
      </div>
    </a>
  );
}

export function BundleRecommendations({ data }: BundleRecommendationsProps) {
  const [showAll, setShowAll] = useState(false);

  const relevantTags = useMemo(() => getRelevantTags(data), [data]);
  const focusBoostTags = useMemo(() => getFocusBoostTags(data.engineFocusArea), [data.engineFocusArea]);

  const scoredFree = useMemo(() => {
    return FREE_PRODUCTS
      .map(p => ({ product: p, score: scoreProduct(p, relevantTags, focusBoostTags) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [relevantTags, focusBoostTags]);

  const scoredVip = useMemo(() => {
    return VIP_PRODUCTS
      .map(p => ({ product: p, score: scoreProduct(p, relevantTags, focusBoostTags) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [relevantTags, focusBoostTags]);

  // Limit: show top 4 free, top 3 VIP
  const displayedFree = showAll ? scoredFree : scoredFree.slice(0, 4);

  if (scoredFree.length === 0 && scoredVip.length === 0) return null;

  const focusLabel = data.engineFocusArea === 'discover' ? 'Lead Gen' : data.engineFocusArea === 'nurture' ? 'Nurture' : data.engineFocusArea === 'convert' ? 'Sales' : null;

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center">
        <h3 className="text-xl font-bold text-foreground mb-1">
          🏎️ Your Pit Crew Picks
        </h3>
        <p className="text-sm text-muted-foreground">
          Tools to supercharge your engine
          {focusLabel ? ` — prioritized for ${focusLabel}` : ' — matched to your blueprint'}
        </p>
      </div>

      {/* Boss Mode / VIP Section */}
      {scoredVip.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <span className="text-lg">👑</span> BOSS MODE PICKS
            </h4>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Upgrade to Boss Mode to unlock →
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scoredVip.slice(0, 3).map(({ product }) => (
              <ProductCard key={`vip-${product.giftName}`} product={product} isVip />
            ))}
          </div>
        </div>
      )}

      {/* Free Recommendations */}
      {scoredFree.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="text-lg">🎁</span> TOP PICKS FOR YOUR ENGINE
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedFree.map(({ product }) => (
              <ProductCard key={`free-${product.name}-${product.giftName}`} product={product} />
            ))}
          </div>
          {scoredFree.length > 4 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-sm font-medium text-primary hover:underline"
            >
              {showAll ? 'Show top picks only' : `Show all ${scoredFree.length} matched picks`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
