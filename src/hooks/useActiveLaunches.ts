import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { addDays, differenceInDays, format } from 'date-fns';

export interface ActiveLaunch {
  id: string;
  name: string;
  project_id: string;
  cart_opens: string;
  cart_closes: string;
  revenue_goal: number | null;
  status: string;
  has_waitlist: boolean;
  waitlist_opens: string | null;
  email_sequences: string[];
  live_events: Array<{
    type: string;
    date: string;
    time?: string;
    topic: string;
  }>;
  // Computed fields
  daysUntilOpen: number;
  daysUntilClose: number;
  isLive: boolean;
  phase: 'pre-launch' | 'live' | 'closed';
  // Task progress
  tasksTotal: number;
  tasksCompleted: number;
  taskPercent: number;
}

export interface LaunchCheckInQuestion {
  id: string;
  question: string;
  context: string;
  launchName: string;
  phase: 'pre-launch' | 'live' | 'closed';
  priority: 'high' | 'medium' | 'low';
}

export function useActiveLaunches() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-launches-detailed', user?.id],
    queryFn: async (): Promise<ActiveLaunch[]> => {
      if (!user) return [];

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get launches from the launches table
      const { data: launches, error } = await supabase
        .from('launches')
        .select('*')
        .eq('user_id', user.id)
        .gte('cart_closes', today) // Not yet closed
        .order('cart_opens');

      if (error) {
        console.error('Error fetching launches:', error);
        return [];
      }

      if (!launches || launches.length === 0) return [];

      // Get associated projects to count tasks
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_launch', true);

      const projectIds = projects?.map(p => p.id) || [];

      // Get task counts for launch projects
      const { data: tasks } = await supabase
        .from('tasks')
        .select('project_id, status')
        .in('project_id', projectIds.length > 0 ? projectIds : ['none']);

      // Build launch data with computed fields
      return launches.map(launch => {
        const cartOpens = new Date(launch.cart_opens);
        const cartCloses = new Date(launch.cart_closes);
        const now = new Date();

        const daysUntilOpen = differenceInDays(cartOpens, now);
        const daysUntilClose = differenceInDays(cartCloses, now);
        const isLive = now >= cartOpens && now <= cartCloses;
        
        let phase: 'pre-launch' | 'live' | 'closed' = 'pre-launch';
        if (now > cartCloses) phase = 'closed';
        else if (isLive) phase = 'live';

        // Find matching project by launch name
        const matchingProject = projects?.find(p => 
          p.name.includes(launch.name) || p.name.includes('🚀')
        );
        
        const projectTasks = tasks?.filter(t => t.project_id === matchingProject?.id) || [];
        const tasksTotal = projectTasks.length;
        const tasksCompleted = projectTasks.filter(t => t.status === 'done').length;
        const taskPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

        return {
          id: launch.id,
          name: launch.name,
          project_id: matchingProject?.id || '',
          cart_opens: launch.cart_opens,
          cart_closes: launch.cart_closes,
          revenue_goal: launch.revenue_goal,
          status: launch.status,
          has_waitlist: launch.has_waitlist,
          waitlist_opens: launch.waitlist_opens,
          email_sequences: launch.email_sequences || [],
          live_events: (launch.live_events as any) || [],
          daysUntilOpen,
          daysUntilClose,
          isLive,
          phase,
          tasksTotal,
          tasksCompleted,
          taskPercent,
        };
      });
    },
    enabled: !!user,
    staleTime: 60_000, // 1 minute
  });
}

export function useLaunchCheckInQuestions(reviewType: 'daily' | 'weekly' | 'monthly') {
  const { data: launches = [] } = useActiveLaunches();

  // Generate contextual check-in questions based on active launches
  const questions: LaunchCheckInQuestion[] = [];

  launches.forEach(launch => {
    const { name, phase, daysUntilOpen, daysUntilClose, email_sequences, has_waitlist, taskPercent } = launch;

    if (reviewType === 'daily') {
      // Daily questions focus on today's actions
      if (phase === 'pre-launch') {
        if (daysUntilOpen <= 7 && daysUntilOpen > 0) {
          questions.push({
            id: `${launch.id}-final-prep`,
            question: `${daysUntilOpen} days until ${name} opens. What's your #1 priority today?`,
            context: 'Final prep phase - focus on critical path items',
            launchName: name,
            phase,
            priority: 'high',
          });
        }
        if (email_sequences.includes('warm-up') && daysUntilOpen <= 14) {
          questions.push({
            id: `${launch.id}-warmup`,
            question: `How is your warm-up email sequence going for ${name}?`,
            context: 'Warm-up sequence should be building anticipation',
            launchName: name,
            phase,
            priority: 'medium',
          });
        }
        if (has_waitlist) {
          questions.push({
            id: `${launch.id}-waitlist`,
            question: `How many waitlist signups do you have for ${name}?`,
            context: 'Track waitlist growth daily during pre-launch',
            launchName: name,
            phase,
            priority: 'medium',
          });
        }
      } else if (phase === 'live') {
        questions.push({
          id: `${launch.id}-sales`,
          question: `How many sales did you make today for ${name}?`,
          context: `${daysUntilClose} days left in launch`,
          launchName: name,
          phase,
          priority: 'high',
        });
        if (daysUntilClose <= 2) {
          questions.push({
            id: `${launch.id}-urgency`,
            question: `Cart closes in ${daysUntilClose} days! What urgency tactics are you deploying?`,
            context: 'Final cart close push',
            launchName: name,
            phase,
            priority: 'high',
          });
        }
      }
    }

    if (reviewType === 'weekly') {
      if (phase === 'pre-launch') {
        questions.push({
          id: `${launch.id}-prep-progress`,
          question: `What percentage of your ${name} launch prep is complete?`,
          context: `${taskPercent}% of launch tasks done`,
          launchName: name,
          phase,
          priority: 'high',
        });
        if (daysUntilOpen <= 14) {
          questions.push({
            id: `${launch.id}-blockers`,
            question: `What's the biggest blocker for your ${name} launch?`,
            context: 'Identify and remove obstacles',
            launchName: name,
            phase,
            priority: 'high',
          });
        }
      } else if (phase === 'live') {
        questions.push({
          id: `${launch.id}-revenue`,
          question: `What's your ${name} revenue so far this week?`,
          context: launch.revenue_goal ? `Goal: $${launch.revenue_goal.toLocaleString()}` : 'Track your sales',
          launchName: name,
          phase,
          priority: 'high',
        });
      }
    }

    if (reviewType === 'monthly') {
      if (phase === 'pre-launch' && daysUntilOpen <= 30) {
        questions.push({
          id: `${launch.id}-ready`,
          question: `Rate your confidence in ${name} launch readiness (1-10)`,
          context: `${daysUntilOpen} days until cart opens`,
          launchName: name,
          phase,
          priority: 'high',
        });
      }
      if (phase === 'live' || (phase === 'pre-launch' && daysUntilOpen <= 7)) {
        questions.push({
          id: `${launch.id}-lessons`,
          question: `What's the #1 lesson from your ${name} launch so far?`,
          context: 'Capture insights while they\'re fresh',
          launchName: name,
          phase,
          priority: 'medium',
        });
      }
    }
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  questions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return questions;
}
