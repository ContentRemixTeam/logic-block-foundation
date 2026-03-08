/**
 * Seasonal Ambient Animations
 * Lightweight CSS-only particle effects that overlay the app
 * Renders based on active theme's ambient config
 */
import { memo } from 'react';
import type { AmbientStyle } from '@/lib/themeConfigSchema';
import './SeasonalAmbient.css';

interface SeasonalAmbientProps {
  style: AmbientStyle;
  opacity?: number;
}

const PARTICLE_CHARS: Record<AmbientStyle, string[]> = {
  none: [],
  snowfall: ['❄', '❅', '❆', '•'],
  hearts: ['♥', '♡', '💕', '💗'],
  sparkle: ['✦', '✧', '⋆', '·'],
  petals: ['🌸', '✿', '❀', '•'],
  sunbeams: ['✦', '·', '○', '◦'],
  fireflies: ['•', '·', '✦', '○'],
  'falling-leaves': ['🍂', '🍁', '🍃', '•'],
};

const STYLE_CLASSES: Record<AmbientStyle, string> = {
  none: '',
  snowfall: 'ambient-snow',
  hearts: 'ambient-float',
  sparkle: 'ambient-twinkle',
  petals: 'ambient-drift',
  sunbeams: 'ambient-float-slow',
  fireflies: 'ambient-twinkle',
  'falling-leaves': 'ambient-drift',
};

function SeasonalAmbientInner({ style, opacity = 0.4 }: SeasonalAmbientProps) {
  if (style === 'none') return null;

  const particles = PARTICLE_CHARS[style] || [];
  const animClass = STYLE_CLASSES[style] || '';

  // Generate 12 particles with staggered positions and delays
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity }}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const char = particles[i % particles.length];
        const left = ((i * 8.33) + Math.random() * 4).toFixed(1);
        const delay = (i * 0.8 + Math.random() * 2).toFixed(1);
        const size = 12 + (i % 3) * 6;
        const duration = 8 + (i % 4) * 3;

        return (
          <span
            key={i}
            className={`absolute ${animClass}`}
            style={{
              left: `${left}%`,
              top: '-20px',
              fontSize: `${size}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}

export const SeasonalAmbient = memo(SeasonalAmbientInner);
