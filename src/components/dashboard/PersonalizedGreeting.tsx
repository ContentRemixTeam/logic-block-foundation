import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, subDays } from 'date-fns';
import { Flame, Sun, Moon, Coffee, Sparkles } from 'lucide-react';

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 5) return { greeting: 'Burning the midnight oil', icon: Moon, emoji: '🌙' };
  if (hour < 12) return { greeting: 'Good morning', icon: Coffee, emoji: '☀️' };
  if (hour < 17) return { greeting: 'Good afternoon', icon: Sun, emoji: '🌤️' };
  if (hour < 21) return { greeting: 'Good evening', icon: Moon, emoji: '🌆' };
  return { greeting: 'Winding down', icon: Moon, emoji: '🌙' };
}

function getFirstName(email?: string | null) {
  if (!email) return '';
  const name = email.split('@')[0];
  // Capitalize and clean up
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/[._-]/g, ' ').split(' ')[0];
}

const MOTIVATIONAL_LINES = [
  "Let's make today count.",
  "Small steps, big results.",
  "You're building something amazing.",
  "Focus on progress, not perfection.",
  "One task at a time.",
  "You've got this.",
  "Momentum is everything.",
  "Show up and ship.",
];

export function PersonalizedGreeting() {
  const { user } = useAuth();
  const timeInfo = useMemo(() => getTimeOfDay(), []);
  const firstName = useMemo(() => getFirstName(user?.email), [user?.email]);
  const motivation = useMemo(
    () => MOTIVATIONAL_LINES[new Date().getDate() % MOTIVATIONAL_LINES.length],
    []
  );

  // Fetch streak data
  const { data: streakData } = useQuery({
    queryKey: ['daily-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return { streak: 0, tasksYesterday: 0 };

      // Check consecutive daily plans
      let streak = 0;
      const today = startOfDay(new Date());

      for (let i = 0; i < 30; i++) {
        const checkDate = format(subDays(today, i), 'yyyy-MM-dd');
        const { data } = await supabase
          .from('daily_plans')
          .select('day_id')
          .eq('user_id', user.id)
          .eq('date', checkDate)
          .maybeSingle();

        if (data) {
          streak++;
        } else if (i > 0) {
          break; // Don't break on today (might not have logged yet)
        }
      }

      // Count tasks completed yesterday
      const yesterday = format(subDays(today, 1), 'yyyy-MM-dd');
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'done')
        .gte('completed_at', `${yesterday}T00:00:00`)
        .lt('completed_at', `${format(today, 'yyyy-MM-dd')}T00:00:00`);

      return { streak, tasksYesterday: count || 0 };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const streak = streakData?.streak || 0;
  const tasksYesterday = streakData?.tasksYesterday || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <motion.h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {timeInfo.greeting}{firstName ? `, ${firstName}` : ''} {timeInfo.emoji}
          </motion.h1>
        </div>

        <motion.div
          className="flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <p className="text-muted-foreground text-sm">{motivation}</p>

          {streak >= 2 && (
            <motion.div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.5 }}
            >
              <Flame className="h-3.5 w-3.5" />
              {streak}-day streak
            </motion.div>
          )}

          {tasksYesterday > 0 && (
            <motion.span
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              You completed {tasksYesterday} task{tasksYesterday > 1 ? 's' : ''} yesterday!
            </motion.span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
