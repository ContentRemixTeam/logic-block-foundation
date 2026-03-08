/**
 * Celebration Screen — Premium Minimal Edition
 * Elegant light-based animation triggered on task completion
 * Soft radial glow + tiny rising particles + refined check
 */
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CelebrationStyle } from '@/lib/themeConfigSchema';

interface CelebrationScreenProps {
  style: CelebrationStyle;
  duration?: number;
  trigger: number;
}

/**
 * Each celebration style maps to an elegant color palette
 * No emojis — uses soft glowing dots and light effects
 */
const STYLE_PALETTES: Record<CelebrationStyle, string[]> = {
  none: [],
  'confetti-burst': ['hsl(280 30% 75%)', 'hsl(200 35% 80%)', 'hsl(45 30% 82%)', 'hsl(340 25% 78%)'],
  'firework-show': ['hsl(45 40% 80%)', 'hsl(280 25% 82%)', 'hsl(200 30% 85%)', 'hsl(0 0% 90%)'],
  'heart-shower': ['hsl(340 35% 75%)', 'hsl(350 30% 80%)', 'hsl(330 25% 85%)', 'hsl(345 20% 88%)'],
  'star-cascade': ['hsl(45 35% 80%)', 'hsl(40 30% 85%)', 'hsl(50 25% 82%)', 'hsl(0 0% 90%)'],
  'snow-globe': ['hsl(210 25% 88%)', 'hsl(200 20% 90%)', 'hsl(220 15% 92%)', 'hsl(0 0% 95%)'],
  'petal-swirl': ['hsl(340 25% 82%)', 'hsl(330 20% 86%)', 'hsl(350 30% 84%)', 'hsl(0 0% 92%)'],
  'leaf-tornado': ['hsl(25 30% 70%)', 'hsl(35 25% 75%)', 'hsl(15 20% 72%)', 'hsl(40 15% 80%)'],
  'sparkle-wave': ['hsl(280 20% 85%)', 'hsl(200 25% 88%)', 'hsl(45 20% 86%)', 'hsl(0 0% 92%)'],
};

function generateParticles(style: CelebrationStyle) {
  const palette = STYLE_PALETTES[style] || STYLE_PALETTES['confetti-burst'];
  // Fewer particles, more deliberate placement
  return Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    color: palette[i % palette.length],
    size: 3 + Math.random() * 4,
    startX: 40 + Math.random() * 20, // cluster near center
    startY: 50,
    endX: 10 + Math.random() * 80,
    endY: 10 + Math.random() * 30, // rise upward
    delay: Math.random() * 0.3,
  }));
}

export function CelebrationScreen({ style, duration = 2000, trigger }: CelebrationScreenProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<ReturnType<typeof generateParticles>>([]);

  const fire = useCallback(() => {
    if (style === 'none') return;
    setParticles(generateParticles(style));
    setVisible(true);
    setTimeout(() => setVisible(false), duration);
  }, [style, duration]);

  useEffect(() => {
    if (trigger > 0) fire();
  }, [trigger, fire]);

  if (style === 'none') return null;

  const accentColor = STYLE_PALETTES[style]?.[0] ?? 'hsl(0 0% 85%)';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Soft radial glow from center */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <div
              className="h-64 w-64 rounded-full blur-3xl"
              style={{ backgroundColor: accentColor, opacity: 0.3 }}
            />
          </motion.div>

          {/* Rising light particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              }}
              initial={{
                left: `${p.startX}%`,
                top: `${p.startY}%`,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                left: `${p.endX}%`,
                top: `${p.endY}%`,
                opacity: [0, 0.9, 0],
                scale: [0, 1.5, 0.5],
              }}
              transition={{
                duration: 1.4,
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Elegant check mark */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, delay: 0.1, times: [0, 0.3, 1], ease: 'easeOut' }}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
