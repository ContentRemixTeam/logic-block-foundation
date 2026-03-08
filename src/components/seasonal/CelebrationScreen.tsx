/**
 * Celebration Screen
 * Full-screen animated overlay triggered on task completion
 * Uses framer-motion for smooth entrance/exit
 */
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CelebrationStyle } from '@/lib/themeConfigSchema';

interface CelebrationScreenProps {
  style: CelebrationStyle;
  duration?: number;
  trigger: number; // increment to trigger
}

const CELEBRATION_EMOJIS: Record<CelebrationStyle, string[]> = {
  none: [],
  'confetti-burst': ['🎉', '🎊', '✨', '⭐', '🌟', '💫'],
  'firework-show': ['🎆', '🎇', '✨', '💥', '⭐', '🌟'],
  'heart-shower': ['❤️', '💕', '💗', '💖', '💝', '♥️'],
  'star-cascade': ['⭐', '🌟', '✨', '💫', '🌠', '⋆'],
  'snow-globe': ['❄️', '❅', '❆', '🌨️', '⛄', '✨'],
  'petal-swirl': ['🌸', '🌺', '🌷', '✿', '❀', '💮'],
  'leaf-tornado': ['🍂', '🍁', '🍃', '🌿', '☘️', '🍀'],
  'sparkle-wave': ['✨', '💎', '🔮', '⚡', '💫', '🌟'],
};

function generateParticles(style: CelebrationStyle) {
  const emojis = CELEBRATION_EMOJIS[style] || CELEBRATION_EMOJIS['confetti-burst'];
  return Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    emoji: emojis[i % emojis.length],
    x: Math.random() * 100,
    startY: style === 'star-cascade' || style === 'heart-shower' ? -10 : 50,
    endY: style === 'star-cascade' || style === 'heart-shower' ? 110 : 50,
    endX: (Math.random() - 0.5) * 60 + 50,
    delay: Math.random() * 0.5,
    size: 18 + Math.random() * 24,
    rotation: Math.random() * 720 - 360,
  }));
}

export function CelebrationScreen({ style, duration = 2500, trigger }: CelebrationScreenProps) {
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

  const isBurst = ['confetti-burst', 'firework-show', 'sparkle-wave'].includes(style);
  const isShower = ['heart-shower', 'star-cascade', 'snow-globe', 'petal-swirl', 'leaf-tornado'].includes(style);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Center flash */}
          {isBurst && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <div className="h-24 w-24 rounded-full bg-primary/30 blur-xl" />
            </motion.div>
          )}

          {/* Particles */}
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute"
              style={{ fontSize: p.size }}
              initial={{
                left: isBurst ? '50%' : `${p.x}%`,
                top: isBurst ? '50%' : `${p.startY}%`,
                opacity: 1,
                scale: isBurst ? 0 : 0.5,
                rotate: 0,
              }}
              animate={{
                left: isBurst ? `${p.endX}%` : `${p.x + (Math.random() - 0.5) * 20}%`,
                top: isBurst ? `${Math.random() * 80 + 10}%` : `${p.endY}%`,
                opacity: [1, 1, 0],
                scale: isBurst ? [0, 1.2, 0.8] : [0.5, 1, 0.6],
                rotate: p.rotation,
              }}
              transition={{
                duration: isShower ? 2.2 : 1.5,
                delay: p.delay,
                ease: isBurst ? 'easeOut' : 'linear',
              }}
            >
              {p.emoji}
            </motion.span>
          ))}

          {/* Completion text flash */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5, delay: 0.2, times: [0, 0.2, 0.7, 1] }}
          >
            <span className="text-4xl font-bold text-primary drop-shadow-lg">
              ✓
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
