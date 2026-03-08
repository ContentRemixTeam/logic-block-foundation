/**
 * Temporary demo page to preview seasonal effects
 * Remove after review
 */
import { useState } from 'react';
import { SeasonalAmbient } from '@/components/seasonal/SeasonalAmbient';
import { CelebrationScreen } from '@/components/seasonal/CelebrationScreen';
import { Button } from '@/components/ui/button';
import type { AmbientStyle, CelebrationStyle } from '@/lib/themeConfigSchema';

const DEMO_THEMES: { label: string; emoji: string; ambient: AmbientStyle; celebration: CelebrationStyle; bg: string }[] = [
  { label: 'Valentine\'s Glow', emoji: '💕', ambient: 'hearts', celebration: 'heart-shower', bg: 'from-pink-950/40 to-rose-950/30' },
  { label: 'Winter Wonderland', emoji: '❄️', ambient: 'snowfall', celebration: 'snow-globe', bg: 'from-blue-950/40 to-cyan-950/30' },
  { label: 'Cherry Blossom', emoji: '🌸', ambient: 'petals', celebration: 'petal-swirl', bg: 'from-pink-950/30 to-fuchsia-950/20' },
  { label: 'Harvest Moon', emoji: '🎃', ambient: 'falling-leaves', celebration: 'leaf-tornado', bg: 'from-orange-950/40 to-amber-950/30' },
  { label: 'Summer Glow', emoji: '☀️', ambient: 'fireflies', celebration: 'sparkle-wave', bg: 'from-yellow-950/30 to-orange-950/20' },
  { label: 'New Year Spark', emoji: '✨', ambient: 'sparkle', celebration: 'firework-show', bg: 'from-violet-950/40 to-indigo-950/30' },
];

export default function EffectsDemo() {
  const [activeTheme, setActiveTheme] = useState(0);
  const [celebrationTrigger, setCelebrationTrigger] = useState(0);
  const theme = DEMO_THEMES[activeTheme];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} relative overflow-hidden`}>
      {/* Ambient particles */}
      <SeasonalAmbient style={theme.ambient} opacity={0.5} />

      {/* Celebration overlay */}
      <CelebrationScreen
        style={theme.celebration}
        duration={3000}
        trigger={celebrationTrigger}
      />

      {/* Controls */}
      <div className="relative z-10 max-w-2xl mx-auto pt-16 px-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">🎨 Seasonal Effects Preview</h1>
        <p className="text-muted-foreground mb-8">
          These effects activate when users unlock monthly themes by completing challenges.
        </p>

        {/* Theme selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {DEMO_THEMES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActiveTheme(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                i === activeTheme
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border/50 bg-card/50 hover:border-primary/40'
              }`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <p className="text-sm font-medium text-foreground mt-1">{t.label}</p>
              <p className="text-xs text-muted-foreground capitalize">{t.ambient} particles</p>
            </button>
          ))}
        </div>

        {/* Celebration trigger */}
        <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/50 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            This plays when a user completes a task with an active theme:
          </p>
          <Button
            size="lg"
            onClick={() => setCelebrationTrigger(prev => prev + 1)}
            className="text-lg px-8"
          >
            {theme.emoji} Trigger Celebration!
          </Button>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Style: {theme.celebration}
          </p>
        </div>

        {/* Badge preview */}
        <div className="mt-8 bg-card/60 backdrop-blur-sm rounded-xl border border-border/50 p-6">
          <p className="text-sm font-medium text-foreground mb-3">Badge Trophy Case Preview</p>
          <div className="flex gap-4 flex-wrap">
            {DEMO_THEMES.map((t) => (
              <div key={t.label} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-2xl">
                  {t.emoji}
                </div>
                <span className="text-[10px] text-muted-foreground text-center max-w-[60px] leading-tight">
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
