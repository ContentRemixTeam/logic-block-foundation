import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format, parseISO, isWithinInterval } from 'date-fns';

export interface ActiveSummit {
  id: string;
  name: string;
  project_id: string;
  summit_start_date: string;
  summit_end_date: string;
  registration_opens: string | null;
  cart_closes: string | null;
  speaker_recruitment_deadline: string | null;
  target_speaker_count: number;
  registration_goal: number | null;
  all_access_price: number | null;
  has_all_access_pass: boolean;
  status: string;
  // Computed fields
  phase: 'recruitment' | 'content' | 'promotion' | 'live' | 'post-summit';
  phaseLabel: string;
  daysUntilStart: number;
  daysUntilEnd: number;
  daysInPhase: number;
  tasksTotal: number;
  tasksCompleted: number;
  taskPercent: number;
  speakersConfirmed: number;
}

export interface SummitCheckInQuestion {
  id: string;
  question: string;
  context: string;
  summitName: string;
  phase: string;
  priority: 'high' | 'medium' | 'low';
}

export function useActiveSummits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-summits', user?.id],
    queryFn: async (): Promise<ActiveSummit[]> => {
      if (!user) return [];

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Get summits that are active (not completed/cancelled)
      const { data: summits, error } = await supabase
        .from('summits')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('summit_start_date');

      if (error) {
        console.error('Error fetching summits:', error);
        return [];
      }

      if (!summits || summits.length === 0) return [];

      // Get task counts for summit projects
      const projectIds = summits.map(s => s.project_id).filter(Boolean);
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('project_id, status')
        .in('project_id', projectIds.length > 0 ? projectIds : ['none']);

      // Build summit data with computed fields
      return summits.map(summit => {
        const summitStart = parseISO(summit.summit_start_date);
        const summitEnd = parseISO(summit.summit_end_date);
        const regOpens = summit.registration_opens ? parseISO(summit.registration_opens) : null;
        const cartCloses = summit.cart_closes ? parseISO(summit.cart_closes) : null;
        const speakerDeadline = summit.speaker_recruitment_deadline 
          ? parseISO(summit.speaker_recruitment_deadline) 
          : null;

        const daysUntilStart = differenceInDays(summitStart, today);
        const daysUntilEnd = differenceInDays(summitEnd, today);

        // Determine current phase
        let phase: ActiveSummit['phase'] = 'recruitment';
        let phaseLabel = 'Speaker Recruitment';
        let daysInPhase = 0;

        const postSummitEnd = cartCloses || summitEnd;
        
        if (today > postSummitEnd) {
          phase = 'post-summit';
          phaseLabel = 'Post-Summit';
          daysInPhase = differenceInDays(today, postSummitEnd);
        } else if (isWithinInterval(today, { start: summitStart, end: summitEnd })) {
          phase = 'live';
          phaseLabel = 'LIVE';
          daysInPhase = differenceInDays(today, summitStart) + 1;
        } else if (regOpens && today >= regOpens && today < summitStart) {
          phase = 'promotion';
          phaseLabel = 'Promotion';
          daysInPhase = differenceInDays(today, regOpens) + 1;
        } else if (speakerDeadline && today >= speakerDeadline && today < (regOpens || summitStart)) {
          phase = 'content';
          phaseLabel = 'Content Creation';
          daysInPhase = differenceInDays(today, speakerDeadline) + 1;
        } else {
          phase = 'recruitment';
          phaseLabel = 'Speaker Recruitment';
          daysInPhase = speakerDeadline 
            ? Math.max(1, differenceInDays(speakerDeadline, today))
            : daysUntilStart;
        }

        // Task progress
        const projectTasks = tasks?.filter(t => t.project_id === summit.project_id) || [];
        const tasksTotal = projectTasks.length;
        const tasksCompleted = projectTasks.filter(t => t.status === 'done').length;
        const taskPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

        return {
          id: summit.id,
          name: summit.name,
          project_id: summit.project_id,
          summit_start_date: summit.summit_start_date,
          summit_end_date: summit.summit_end_date,
          registration_opens: summit.registration_opens,
          cart_closes: summit.cart_closes,
          speaker_recruitment_deadline: summit.speaker_recruitment_deadline,
          target_speaker_count: summit.target_speaker_count || 0,
          registration_goal: summit.registration_goal,
          all_access_price: summit.all_access_price,
          has_all_access_pass: summit.has_all_access_pass || false,
          status: summit.status,
          phase,
          phaseLabel,
          daysUntilStart,
          daysUntilEnd,
          daysInPhase,
          tasksTotal,
          tasksCompleted,
          taskPercent,
          speakersConfirmed: 0, // Would come from speaker tracking table
        };
      });
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useSummitCheckInQuestions(reviewType: 'daily' | 'weekly' | 'monthly') {
  const { data: summits = [] } = useActiveSummits();

  const questions: SummitCheckInQuestion[] = [];

  summits.forEach(summit => {
    const { name, phase, daysUntilStart, target_speaker_count, registration_goal, taskPercent } = summit;

    if (reviewType === 'daily') {
      if (phase === 'recruitment') {
        questions.push({
          id: `${summit.id}-speakers`,
          question: `How many speaker invitations did you send today for ${name}?`,
          context: `Target: ${target_speaker_count} speakers`,
          summitName: name,
          phase,
          priority: 'high',
        });
      } else if (phase === 'content') {
        questions.push({
          id: `${summit.id}-assets`,
          question: `What speaker assets did you collect today for ${name}?`,
          context: 'Bios, headshots, recordings',
          summitName: name,
          phase,
          priority: 'high',
        });
      } else if (phase === 'promotion') {
        questions.push({
          id: `${summit.id}-registrations`,
          question: `How many registrations did you get today for ${name}?`,
          context: registration_goal ? `Goal: ${registration_goal}` : 'Track your signups',
          summitName: name,
          phase,
          priority: 'high',
        });
      } else if (phase === 'live') {
        questions.push({
          id: `${summit.id}-engagement`,
          question: `How was today's summit engagement for ${name}?`,
          context: 'Track attendance, comments, questions',
          summitName: name,
          phase,
          priority: 'high',
        });
        if (summit.has_all_access_pass) {
          questions.push({
            id: `${summit.id}-aap-sales`,
            question: `All-Access Pass sales today for ${name}?`,
            context: `Price: $${summit.all_access_price}`,
            summitName: name,
            phase,
            priority: 'high',
          });
        }
      }
    }

    if (reviewType === 'weekly') {
      if (phase === 'recruitment') {
        questions.push({
          id: `${summit.id}-speaker-progress`,
          question: `How many speakers have confirmed for ${name}?`,
          context: `Target: ${target_speaker_count} speakers`,
          summitName: name,
          phase,
          priority: 'high',
        });
      }
      questions.push({
        id: `${summit.id}-task-progress`,
        question: `What's your ${name} summit prep progress?`,
        context: `${taskPercent}% of tasks done`,
        summitName: name,
        phase,
        priority: 'medium',
      });
    }

    if (reviewType === 'monthly') {
      if (daysUntilStart <= 45 && daysUntilStart > 0) {
        questions.push({
          id: `${summit.id}-readiness`,
          question: `Rate your confidence in ${name} summit readiness (1-10)`,
          context: `${daysUntilStart} days until summit starts`,
          summitName: name,
          phase,
          priority: 'high',
        });
      }
    }
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  questions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return questions;
}
