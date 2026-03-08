/**
 * Seasonal Ambient Animations — Premium Minimal Edition
 * Tiny translucent geometric particles that drift subtly
 * No emojis — uses CSS circles, dots, and soft glows
 */
import { memo, useMemo } from 'react';
import type { AmbientStyle } from '@/lib/themeConfigSchema';
import './SeasonalAmbient.css';

interface SeasonalAmbientProps {
  style: AmbientStyle;
  opacity?: number;
}

/**
 * Each style gets a palette of HSL colors (muted, elegant tones)
 * and a shape type. No emojis anywhere.
 */
const STYLE_CONFIG: Record<AmbientStyle, {
  colors: string[];
  shape: 'circle' | 'diamond' | 'line';
  animation: string;
  count: number;
  sizeRange: [number, number]; // min, max in px
}> = {
  none: { colors: [], shape: 'circle', animation: '', count: 0, sizeRange: [2, 4] },
  snowfall: {
    colors: ['hsl(210 30% 90%)', 'hsl(200 20% 85%)', 'hsl(220 15% 95%)'],
    shape: 'circle', animation: 'ambient-snow', count: 8, sizeRange: [2, 5],
  },
  hearts: {
    colors: ['hsl(340 40% 75%)', 'hsl(350 35% 80%)', 'hsl(330 30% 85%)'],
    shape: 'circle', animation: 'ambient-float', count: 6, sizeRange: [3, 6],
  },
  sparkle: {
    colors: ['hsl(45 30% 85%)', 'hsl(280 20% 88%)', 'hsl(200 25% 90%)'],
    shape: 'diamond', animation: 'ambient-twinkle', count: 7, sizeRange: [2, 4],
  },
  petals: {
    colors: ['hsl(340 25% 85%)', 'hsl(330 20% 90%)', 'hsl(350 30% 88%)'],
    shape: 'circle', animation: 'ambient-drift', count: 6, sizeRange: [3, 6],
  },
  sunbeams: {
    colors: ['hsl(40 35% 85%)', 'hsl(35 30% 90%)', 'hsl(45 25% 88%)'],
    shape: 'circle', animation: 'ambient-float', count: 5, sizeRange: [3, 7],
  },
  fireflies: {
    colors: ['hsl(50 40% 80%)', 'hsl(45 35% 85%)', 'hsl(55 30% 82%)'],
    shape: 'circle', animation: 'ambient-twinkle', count: 6, sizeRange: [2, 4],
  },
  'falling-leaves': {
    colors: ['hsl(25 35% 70%)', 'hsl(35 30% 75%)', 'hsl(15 25% 72%)'],
    shape: 'circle', animation: 'ambient-drift', count: 6, sizeRange: [3, 5],
  },
};

function SeasonalAmbientInner({ style, opacity = 0.3 }: SeasonalAmbientProps) {
  const config = STYLE_CONFIG[style];

  const particles = useMemo(() => {
    if (!config || config.count === 0) return [];
    return Array.from({ length: config.count }).map((_, i) => {
      const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
      const left = ((i * (100 / config.count)) + Math.random() * 8).toFixed(1);
      const delay = (i * 1.2 + Math.random() * 3).toFixed(1);
      const duration = 12 + (i % 3) * 5;
      const color = config.colors[i % config.colors.length];

      return { size, left, delay, duration, color };
    });
  }, [style, config]);

  if (style === 'none' || !config || particles.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity }}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className={`absolute ${config.animation}`}
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: config.shape === 'diamond' ? '1px' : '50%',
            transform: config.shape === 'diamond' ? 'rotate(45deg)' : undefined,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export const SeasonalAmbient = memo(SeasonalAmbientInner);
