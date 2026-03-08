/**
 * Effects Demo — Full 12-Month Seasonal Theme Gallery
 * Shows: line art graphics, color palettes, themed cards for each month
 */
import { useState } from 'react';
import { CelebrationScreen } from '@/components/seasonal/CelebrationScreen';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, TrendingUp, Target, Flame, Star } from 'lucide-react';
import { SEASONAL_THEMES, type SeasonalTheme } from '@/lib/seasonalThemes';
import type { CelebrationStyle } from '@/lib/themeConfigSchema';

// Map month indices to celebration styles
const CELEBRATION_MAP: Record<number, CelebrationStyle> = {
  1: 'snow-globe',
  2: 'heart-shower',
  3: 'sparkle-wave',
  4: 'petal-swirl',
  5: 'petal-swirl',
  6: 'sparkle-wave',
  7: 'firework-show',
  8: 'sparkle-wave',
  9: 'leaf-tornado',
  10: 'firework-show',
  11: 'leaf-tornado',
  12: 'confetti-burst',
};

const STAT_CARDS = [
  { label: 'Tasks Done', value: '12', sub: 'this week', icon: Check, delta: '+3' },
  { label: 'Streak', value: '7', sub: 'days', icon: Flame, delta: '+1' },
  { label: 'Revenue', value: '$4,200', sub: 'this month', icon: TrendingUp, delta: '+18%' },
  { label: 'Focus Score', value: '8.5', sub: '/10', icon: Target, delta: '+0.5' },
];

function themeAccent(t: SeasonalTheme) {
  return `hsl(${t.palette.primary})`;
}
function themeBorder(t: SeasonalTheme) {
  return `hsl(${t.palette.primary} / 0.15)`;
}
function themeGradient(t: SeasonalTheme) {
  return `linear-gradient(135deg, hsl(${t.palette.gradientFrom} / 0.08), hsl(${t.palette.gradientTo} / 0.04))`;
}
function themeBannerBg(t: SeasonalTheme) {
  return `linear-gradient(135deg, hsl(${t.palette.primary} / 0.06), hsl(${t.palette.secondary} / 0.03))`;
}
function themeCardAccent(t: SeasonalTheme) {
  return `hsl(${t.palette.primary} / 0.08)`;
}
function themeBannerText(t: SeasonalTheme) {
  return `hsl(${t.palette.primary})`;
}

export default function EffectsDemo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [themeEnabled, setThemeEnabled] = useState(true);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const theme = SEASONAL_THEMES[activeIdx];
  const celebration = CELEBRATION_MAP[theme.month] || 'confetti-burst';

  return (
    <div className="min-h-screen bg-background">
      <CelebrationScreen style={celebration} duration={2000} trigger={celebrationTrigger} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Seasonal Rewards
          </p>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mb-4">
            12 Monthly Themes — Line Art + Palettes
          </h1>

          {/* Month selector */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {SEASONAL_THEMES.map((t, i) => (
              <button
                key={t.slug}
                onClick={() => setActiveIdx(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  i === activeIdx
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted/50 text-muted-foreground border border-transparent hover:border-border/50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${t.palette.primary})` }}
                />
                <span className="hidden sm:inline">{t.name}</span>
                <span className="sm:hidden">{t.emoji}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={themeEnabled} onCheckedChange={setThemeEnabled} />
            <span className="text-xs text-muted-foreground">
              {themeEnabled ? 'Theme active' : 'Theme off — monochrome base'}
            </span>
          </div>
        </div>

        {/* === LINE ART + PALETTE SHOWCASE === */}
        <div
          className="rounded-lg border overflow-hidden mb-6 transition-all duration-500"
          style={{
            borderColor: themeEnabled ? themeBorder(theme) : 'hsl(var(--border))',
            background: themeEnabled ? themeBannerBg(theme) : undefined,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Line art graphic */}
            <div className="p-6 flex items-center justify-center bg-white/50 dark:bg-black/20 min-h-[200px]">
              <img
                src={theme.art}
                alt={theme.name}
                className="max-h-[180px] w-auto object-contain opacity-80"
              />
            </div>
            {/* Theme info + palette swatches */}
            <div className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{theme.emoji}</span>
                <h2 className="text-lg font-semibold text-foreground">{theme.name}</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{theme.tagline}</p>

              {/* Color palette swatches */}
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Color Palette
              </p>
              <div className="flex gap-2 mb-4">
                {[
                  { label: 'Primary', hsl: theme.palette.primary },
                  { label: 'Secondary', hsl: theme.palette.secondary },
                  { label: 'Muted', hsl: theme.palette.mutedAccent },
                  { label: 'Bg Tint', hsl: theme.palette.backgroundTint },
                ].map(swatch => (
                  <div key={swatch.label} className="text-center">
                    <div
                      className="w-10 h-10 rounded-md border border-border/30 mb-1"
                      style={{ backgroundColor: `hsl(${swatch.hsl})` }}
                    />
                    <p className="text-[9px] text-muted-foreground">{swatch.label}</p>
                  </div>
                ))}
              </div>

              {/* Gradient preview */}
              <div
                className="h-8 rounded-md"
                style={{
                  background: `linear-gradient(135deg, hsl(${theme.palette.gradientFrom}), hsl(${theme.palette.gradientTo}))`,
                }}
              />
              <p className="text-[9px] text-muted-foreground mt-1">Gradient: From → To</p>

              {/* Badge preview */}
              <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-md bg-muted/30 border border-border/20">
                <span className="text-base">{theme.badgeEmoji}</span>
                <div>
                  <p className="text-[10px] font-medium text-foreground">{theme.badgeLabel}</p>
                  <p className="text-[9px] text-muted-foreground">Earned badge</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === THEMED BANNER === */}
        {themeEnabled && (
          <div
            className="rounded-lg px-5 py-3.5 mb-6 border transition-all duration-500"
            style={{
              background: themeBannerBg(theme),
              borderColor: themeBorder(theme),
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{
                    background: themeGradient(theme),
                    border: `1px solid ${themeBorder(theme)}`,
                  }}
                >
                  <Star className="w-3.5 h-3.5" style={{ color: themeAccent(theme) }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: themeBannerText(theme) }}>
                    {theme.emoji} {theme.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {theme.tagline} · Theme unlocked
                  </p>
                </div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: themeCardAccent(theme),
                  color: themeBannerText(theme),
                }}
              >
                Active
              </span>
            </div>
          </div>
        )}

        {/* === THEMED STAT CARDS === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="relative rounded-lg border p-4 overflow-hidden transition-all duration-500"
                style={{
                  borderColor: themeEnabled ? themeBorder(theme) : 'hsl(var(--border))',
                  background: themeEnabled ? themeGradient(theme) : undefined,
                }}
              >
                {themeEnabled && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500"
                    style={{ backgroundColor: themeAccent(theme), opacity: 0.3 }}
                  />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center transition-all duration-500"
                    style={{
                      backgroundColor: themeEnabled ? themeCardAccent(theme) : 'hsl(var(--muted))',
                    }}
                  >
                    <Icon
                      className="w-3 h-3 transition-colors duration-500"
                      style={{
                        color: themeEnabled ? themeAccent(theme) : 'hsl(var(--muted-foreground))',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {card.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-foreground">{card.value}</span>
                  <span className="text-[10px] text-muted-foreground">{card.sub}</span>
                </div>
                <span
                  className="text-[10px] font-medium mt-1 inline-block"
                  style={{ color: themeEnabled ? themeAccent(theme) : 'hsl(var(--muted-foreground))' }}
                >
                  {card.delta}
                </span>
              </div>
            );
          })}
        </div>

        {/* === ALL 12 THUMBNAILS === */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Full Collection
          </p>
          <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">
            All 12 Monthly Line Art Graphics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SEASONAL_THEMES.map((t, i) => (
              <button
                key={t.slug}
                onClick={() => setActiveIdx(i)}
                className={`rounded-lg border overflow-hidden text-left transition-all hover:shadow-md ${
                  i === activeIdx ? 'ring-2 ring-primary/30' : ''
                }`}
                style={{
                  borderColor: i === activeIdx ? `hsl(${t.palette.primary} / 0.3)` : 'hsl(var(--border))',
                }}
              >
                <div className="h-24 bg-white/50 dark:bg-black/20 flex items-center justify-center overflow-hidden">
                  <img src={t.art} alt={t.name} className="max-h-[80px] w-auto object-contain opacity-70" />
                </div>
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: `hsl(${t.palette.primary})` }}
                    />
                    <span className="text-[11px] font-medium text-foreground">{t.emoji} {t.name}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{t.tagline}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Celebration trigger */}
        <div
          className="rounded-lg border p-6 text-center transition-all duration-500"
          style={{
            borderColor: themeEnabled ? themeBorder(theme) : 'hsl(var(--border))',
            background: themeEnabled ? themeBannerBg(theme) : undefined,
          }}
        >
          <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider">
            Task completion animation
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCelebrationTrigger(prev => prev + 1)}
            className="px-6"
            style={{
              borderColor: themeEnabled ? themeBorder(theme) : undefined,
              color: themeEnabled ? themeBannerText(theme) : undefined,
            }}
          >
            Complete Task ✓
          </Button>
        </div>
      </div>
    </div>
  );
}
