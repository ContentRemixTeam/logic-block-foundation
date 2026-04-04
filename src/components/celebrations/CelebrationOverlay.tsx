import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Flame, Star, Trophy, Sparkles } from 'lucide-react';

type CelebrationType = 'task_complete' | 'habit_logged' | 'streak' | 'all_done' | 'milestone';

interface CelebrationEvent {
  type: CelebrationType;
  message?: string;
  streak?: number;
}

// Global event emitter for celebrations
const celebrationListeners: ((event: CelebrationEvent) => void)[] = [];

export function triggerCelebration(event: CelebrationEvent) {
  celebrationListeners.forEach(fn => fn(event));
}

// Confetti particle component
function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        x: x,
        y: [0, -120 - Math.random() * 80, 60],
        scale: [1, 1.2, 0.5],
        rotate: Math.random() * 720 - 360,
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    />
  );
}

const CONFETTI_COLORS = [
  'hsl(330, 81%, 54%)', // primary pink
  'hsl(55, 90%, 70%)',  // yellow
  'hsl(173, 80%, 40%)', // teal
  'hsl(258, 89%, 66%)', // purple
  'hsl(38, 92%, 50%)',  // orange
  'hsl(142, 71%, 45%)', // green
];

const CELEBRATION_CONFIG: Record<CelebrationType, {
  icon: typeof CheckCircle2;
  defaultMessage: string;
  emoji: string;
  showConfetti: boolean;
}> = {
  task_complete: {
    icon: CheckCircle2,
    defaultMessage: 'Task done! 🎯',
    emoji: '✅',
    showConfetti: false,
  },
  habit_logged: {
    icon: Flame,
    defaultMessage: 'Habit tracked!',
    emoji: '🔥',
    showConfetti: false,
  },
  streak: {
    icon: Flame,
    defaultMessage: 'Streak!',
    emoji: '🔥',
    showConfetti: true,
  },
  all_done: {
    icon: Trophy,
    defaultMessage: "All tasks complete! You're a boss! 🏆",
    emoji: '🏆',
    showConfetti: true,
  },
  milestone: {
    icon: Star,
    defaultMessage: 'Milestone reached!',
    emoji: '⭐',
    showConfetti: true,
  },
};

export function CelebrationOverlay() {
  const [current, setCurrent] = useState<CelebrationEvent | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);

  const handleCelebration = useCallback((event: CelebrationEvent) => {
    setCurrent(event);

    const config = CELEBRATION_CONFIG[event.type];
    if (config.showConfetti) {
      const newParticles = Array.from({ length: 24 }, (_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 300,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }

    setTimeout(() => {
      setCurrent(null);
      setParticles([]);
    }, 2000);
  }, []);

  useEffect(() => {
    celebrationListeners.push(handleCelebration);
    return () => {
      const idx = celebrationListeners.indexOf(handleCelebration);
      if (idx !== -1) celebrationListeners.splice(idx, 1);
    };
  }, [handleCelebration]);

  const config = current ? CELEBRATION_CONFIG[current.type] : null;
  const Icon = config?.icon || CheckCircle2;

  return (
    <AnimatePresence>
      {current && config && (
        <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
          {/* Confetti particles */}
          {particles.map((p) => (
            <ConfettiParticle key={p.id} delay={p.delay} x={p.x} color={p.color} />
          ))}

          {/* Main celebration toast */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-card border border-border/60 shadow-xl rounded-2xl px-6 py-4 flex items-center gap-3 max-w-sm"
          >
            <motion.div
              initial={{ rotate: -30, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </motion.div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                {current.message || config.defaultMessage}
              </p>
              {current.streak && current.streak > 1 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {current.streak}-day streak! Keep going 🔥
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
