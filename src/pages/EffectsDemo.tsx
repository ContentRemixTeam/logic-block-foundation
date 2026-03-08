/**
 * Premium effects demo — minimal & elegant preview
 */
import { useState } from 'react';
import { SeasonalAmbient } from '@/components/seasonal/SeasonalAmbient';
import { CelebrationScreen } from '@/components/seasonal/CelebrationScreen';
import { Button } from '@/components/ui/button';
import type { AmbientStyle, CelebrationStyle } from '@/lib/themeConfigSchema';

const DEMO_THEMES: { label: string; ambient: AmbientStyle; celebration: CelebrationStyle; accent: string }[] = [
  { label: "Valentine's Glow", ambient: 'hearts', celebration: 'heart-shower', accent: 'hsl(340 35% 75%)' },
  { label: 'Winter Wonderland', ambient: 'snowfall', celebration: 'snow-globe', accent: 'hsl(210 25% 85%)' },
  { label: 'Cherry Blossom', ambient: 'petals', celebration: 'petal-swirl', accent: 'hsl(340 25% 82%)' },
  { label: 'Harvest Moon', ambient: 'falling-leaves', celebration: 'leaf-tornado', accent: 'hsl(25 30% 70%)' },
  { label: 'Summer Glow', ambient: 'fireflies', celebration: 'sparkle-wave', accent: 'hsl(50 35% 80%)' },
  { label: 'New Year Spark', ambient: 'sparkle', celebration: 'firework-show', accent: 'hsl(280 25% 82%)' },
];

export default function EffectsDemo() {
  const [activeTheme, setActiveTheme] = useState(0);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const theme = DEMO_THEMES[activeTheme];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient particles */}
      <SeasonalAmbient style={theme.ambient} opacity={0.35} />

      {/* Celebration overlay */}
      <CelebrationScreen
        style={theme.celebration}
        duration={2000}
        trigger={celebrationTrigger}
      />

      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto pt-20 px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Seasonal Effects Preview
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">
          Monthly Theme Rewards
        </h1>
        <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
          Subtle ambient particles drift in the background. Task completions trigger an elegant light pulse.
        </p>

        {/* Theme selector */}
        <div className="grid grid-cols-3 gap-2 mb-10">
          {DEMO_THEMES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActiveTheme(i)}
              className={`group p-3 rounded-lg border text-left transition-all duration-200 ${
                i === activeTheme
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/40 bg-card/30 hover:border-border/60'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full mb-2 transition-transform group-hover:scale-110"
                style={{ backgroundColor: t.accent, boxShadow: `0 0 8px ${t.accent}` }}
              />
              <p className="text-xs font-medium text-foreground">{t.label}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{t.ambient}</p>
            </button>
          ))}
        </div>

        {/* Celebration trigger */}
        <div className="border border-border/30 rounded-lg p-8 text-center bg-card/20 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground mb-4">
            Simulates completing a task with this theme active
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCelebrationTrigger(prev => prev + 1)}
            className="px-6"
          >
            Complete Task ✓
          </Button>
        </div>
      </div>
    </div>
  );
}
