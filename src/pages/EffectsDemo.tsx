/**
 * Effects Demo — Seasonal Theme Visual Preview
 * Shows: color palette overlay, themed banner, themed stat cards
 */
import { useState } from 'react';
import { CelebrationScreen } from '@/components/seasonal/CelebrationScreen';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check, TrendingUp, Target, Calendar, Flame, Star } from 'lucide-react';
import type { CelebrationStyle } from '@/lib/themeConfigSchema';

import lineArtImg from '@/assets/samples/sample-line-art.png';
import watercolorImg from '@/assets/samples/sample-watercolor.png';
import geometricImg from '@/assets/samples/sample-geometric.png';
import illustrationImg from '@/assets/samples/sample-illustration.png';

interface SeasonalPalette {
  label: string;
  accent: string;       // primary accent HSL
  accentMuted: string;  // softer version
  gradient: string;     // CSS gradient
  borderColor: string;
  bannerBg: string;
  bannerText: string;
  cardAccent: string;
  watermark: string;    // subtle background character
  celebration: CelebrationStyle;
}

const THEMES: SeasonalPalette[] = [
  {
    label: "Valentine's Glow",
    accent: 'hsl(340 45% 55%)',
    accentMuted: 'hsl(340 30% 90%)',
    gradient: 'linear-gradient(135deg, hsl(340 45% 55% / 0.08), hsl(350 40% 60% / 0.04))',
    borderColor: 'hsl(340 45% 55% / 0.15)',
    bannerBg: 'linear-gradient(135deg, hsl(340 45% 55% / 0.06), hsl(350 35% 65% / 0.03))',
    bannerText: 'hsl(340 45% 45%)',
    cardAccent: 'hsl(340 45% 55% / 0.08)',
    watermark: '♥',
    celebration: 'heart-shower',
  },
  {
    label: 'Winter Wonderland',
    accent: 'hsl(210 40% 55%)',
    accentMuted: 'hsl(210 25% 92%)',
    gradient: 'linear-gradient(135deg, hsl(210 40% 55% / 0.08), hsl(200 35% 60% / 0.04))',
    borderColor: 'hsl(210 40% 55% / 0.15)',
    bannerBg: 'linear-gradient(135deg, hsl(210 40% 55% / 0.06), hsl(220 30% 65% / 0.03))',
    bannerText: 'hsl(210 40% 40%)',
    cardAccent: 'hsl(210 40% 55% / 0.08)',
    watermark: '❄',
    celebration: 'snow-globe',
  },
  {
    label: 'Cherry Blossom',
    accent: 'hsl(330 35% 60%)',
    accentMuted: 'hsl(330 25% 93%)',
    gradient: 'linear-gradient(135deg, hsl(330 35% 60% / 0.08), hsl(340 30% 65% / 0.04))',
    borderColor: 'hsl(330 35% 60% / 0.15)',
    bannerBg: 'linear-gradient(135deg, hsl(330 35% 60% / 0.06), hsl(340 25% 70% / 0.03))',
    bannerText: 'hsl(330 35% 45%)',
    cardAccent: 'hsl(330 35% 60% / 0.08)',
    watermark: '✿',
    celebration: 'petal-swirl',
  },
  {
    label: 'Harvest Moon',
    accent: 'hsl(25 50% 50%)',
    accentMuted: 'hsl(25 30% 92%)',
    gradient: 'linear-gradient(135deg, hsl(25 50% 50% / 0.08), hsl(35 45% 55% / 0.04))',
    borderColor: 'hsl(25 50% 50% / 0.15)',
    bannerBg: 'linear-gradient(135deg, hsl(25 50% 50% / 0.06), hsl(35 40% 55% / 0.03))',
    bannerText: 'hsl(25 50% 38%)',
    cardAccent: 'hsl(25 50% 50% / 0.08)',
    watermark: '🍂',
    celebration: 'leaf-tornado',
  },
  {
    label: 'Summer Glow',
    accent: 'hsl(40 55% 50%)',
    accentMuted: 'hsl(40 30% 93%)',
    gradient: 'linear-gradient(135deg, hsl(40 55% 50% / 0.08), hsl(45 50% 55% / 0.04))',
    borderColor: 'hsl(40 55% 50% / 0.15)',
    bannerBg: 'linear-gradient(135deg, hsl(40 55% 50% / 0.06), hsl(45 45% 55% / 0.03))',
    bannerText: 'hsl(40 55% 38%)',
    cardAccent: 'hsl(40 55% 50% / 0.08)',
    watermark: '✦',
    celebration: 'sparkle-wave',
  },
  {
    label: 'New Year Spark',
    accent: 'hsl(265 35% 55%)',
    accentMuted: 'hsl(265 20% 93%)',
    gradient: 'linear-gradient(135deg, hsl(265 35% 55% / 0.08), hsl(280 30% 60% / 0.04))',
    borderColor: 'hsl(265 35% 55% / 0.15)',
    bannerBg: 'linear-gradient(135deg, hsl(265 35% 55% / 0.06), hsl(280 25% 65% / 0.03))',
    bannerText: 'hsl(265 35% 40%)',
    cardAccent: 'hsl(265 35% 55% / 0.08)',
    watermark: '✧',
    celebration: 'firework-show',
  },
];

// Mock stat cards to simulate dashboard
const STAT_CARDS = [
  { label: 'Tasks Done', value: '12', sub: 'this week', icon: Check, delta: '+3' },
  { label: 'Streak', value: '7', sub: 'days', icon: Flame, delta: '+1' },
  { label: 'Revenue', value: '$4,200', sub: 'this month', icon: TrendingUp, delta: '+18%' },
  { label: 'Focus Score', value: '8.5', sub: '/10', icon: Target, delta: '+0.5' },
];

export default function EffectsDemo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [themeEnabled, setThemeEnabled] = useState(true);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const theme = THEMES[activeIdx];

  return (
    <div className="min-h-screen bg-background">
      {/* Celebration overlay */}
      <CelebrationScreen style={theme.celebration} duration={2000} trigger={celebrationTrigger} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Demo controls */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Preview
          </p>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mb-4">
            Monthly Theme Rewards
          </h1>

          {/* Theme selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {THEMES.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setActiveIdx(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  i === activeIdx
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted/50 text-muted-foreground border border-transparent hover:border-border/50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: t.accent }}
                />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={themeEnabled} onCheckedChange={setThemeEnabled} />
            <span className="text-xs text-muted-foreground">
              {themeEnabled ? 'Theme active' : 'Theme off — base look'}
            </span>
          </div>
        </div>

        {/* === THEMED BANNER === */}
        {themeEnabled && (
          <div
            className="rounded-lg px-5 py-3.5 mb-6 border transition-all duration-500"
            style={{
              background: theme.bannerBg,
              borderColor: theme.borderColor,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{
                    background: theme.gradient,
                    border: `1px solid ${theme.borderColor}`,
                  }}
                >
                  <Star className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: theme.bannerText }}>
                    {theme.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    March 2026 · Theme unlocked
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: theme.cardAccent,
                    color: theme.bannerText,
                  }}
                >
                  Active
                </span>
              </div>
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
                  borderColor: themeEnabled ? theme.borderColor : 'hsl(var(--border))',
                  background: themeEnabled ? theme.gradient : undefined,
                }}
              >
                {/* Subtle watermark */}
                {themeEnabled && (
                  <span
                    className="absolute -bottom-1 -right-1 text-4xl leading-none select-none pointer-events-none transition-opacity duration-500"
                    style={{ opacity: 0.04 }}
                  >
                    {theme.watermark}
                  </span>
                )}

                {/* Card header with themed accent bar */}
                {themeEnabled && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500"
                    style={{ backgroundColor: theme.accent, opacity: 0.3 }}
                  />
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center transition-all duration-500"
                    style={{
                      backgroundColor: themeEnabled ? theme.cardAccent : 'hsl(var(--muted))',
                    }}
                  >
                    <Icon
                      className="w-3 h-3 transition-colors duration-500"
                      style={{
                        color: themeEnabled ? theme.accent : 'hsl(var(--muted-foreground))',
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
                  style={{
                    color: themeEnabled ? theme.accent : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {card.delta}
                </span>
              </div>
            );
          })}
        </div>

        {/* === THEMED WIDGET CARDS === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
          {/* Weekly Focus card */}
          <div
            className="rounded-lg border p-5 transition-all duration-500"
            style={{
              borderColor: themeEnabled ? theme.borderColor : 'hsl(var(--border))',
            }}
          >
            {themeEnabled && (
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: theme.accent, opacity: 0.25 }}
              />
            )}
            <div className="flex items-center gap-2 mb-3">
              <Calendar
                className="w-3.5 h-3.5"
                style={{ color: themeEnabled ? theme.accent : 'hsl(var(--muted-foreground))' }}
              />
              <span className="text-xs font-medium text-foreground">Weekly Focus</span>
            </div>
            <div className="space-y-2">
              {['Launch email sequence', 'Record 3 video lessons', 'Review ad performance'].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center transition-all duration-500"
                    style={{
                      borderColor: themeEnabled ? theme.borderColor : 'hsl(var(--border))',
                      backgroundColor: i === 0 ? (themeEnabled ? theme.cardAccent : 'hsl(var(--muted))') : 'transparent',
                    }}
                  >
                    {i === 0 && (
                      <Check className="w-2.5 h-2.5" style={{ color: themeEnabled ? theme.accent : 'hsl(var(--muted-foreground))' }} />
                    )}
                  </div>
                  <span className={`text-xs ${i === 0 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress card */}
          <div
            className="rounded-lg border p-5 transition-all duration-500"
            style={{
              borderColor: themeEnabled ? theme.borderColor : 'hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Target
                className="w-3.5 h-3.5"
                style={{ color: themeEnabled ? theme.accent : 'hsl(var(--muted-foreground))' }}
              />
              <span className="text-xs font-medium text-foreground">90-Day Progress</span>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Day 42 of 90</span>
                <span>47%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: '47%',
                    backgroundColor: themeEnabled ? theme.accent : 'hsl(var(--primary))',
                    opacity: themeEnabled ? 0.7 : 1,
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              "Build a $10k/month coaching business"
            </p>
          </div>
        </div>

        {/* === GRAPHIC STYLE SAMPLES === */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Choose a style
          </p>
          <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">
            Seasonal Graphic Styles
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            These would appear in banners, card corners, and badges. Pick your favorite direction:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Minimal Line Art', desc: 'Clean thin-line illustrations. Elegant, pairs with any palette.', img: lineArtImg },
              { label: 'Abstract Watercolor', desc: 'Soft organic blobs & washes. Dreamy, premium feel.', img: watercolorImg },
              { label: 'Geometric / Editorial', desc: 'Bold shapes in black + gold. Luxury packaging aesthetic.', img: geometricImg },
              { label: 'Mini Illustrations', desc: 'Detailed cozy scenes. Playful storybook vibe.', img: illustrationImg },
            ].map((style) => (
              <div
                key={style.label}
                className="rounded-lg border border-border overflow-hidden bg-card hover:shadow-md transition-shadow"
              >
                <div className="h-40 bg-muted/30 flex items-center justify-center overflow-hidden">
                  <img
                    src={style.img}
                    alt={style.label}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground">{style.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{style.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Celebration trigger */}
        <div
          className="rounded-lg border p-6 text-center transition-all duration-500"
          style={{
            borderColor: themeEnabled ? theme.borderColor : 'hsl(var(--border))',
            background: themeEnabled ? theme.bannerBg : undefined,
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
              borderColor: themeEnabled ? theme.borderColor : undefined,
              color: themeEnabled ? theme.bannerText : undefined,
            }}
          >
            Complete Task ✓
          </Button>
        </div>
      </div>
    </div>
  );
}
