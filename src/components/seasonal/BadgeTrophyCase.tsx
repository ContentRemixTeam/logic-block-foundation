/**
 * Badge Trophy Case
 * Displays earned monthly theme badges on the dashboard
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface Badge {
  id: string;
  badge_key: string;
  emoji: string;
  label: string;
  description: string | null;
  earned_at: string;
}

export function BadgeTrophyCase() {
  const { user } = useAuth();

  const { data: badges = [] } = useQuery({
    queryKey: ['user-badges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user!.id)
        .order('earned_at', { ascending: true });
      if (error) throw error;
      return data as Badge[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  if (badges.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Theme Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, i) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center text-lg cursor-default hover:scale-110 transition-transform"
                >
                  {badge.emoji}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{badge.label}</p>
                {badge.description && (
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
