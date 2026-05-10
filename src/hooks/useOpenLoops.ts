import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type OpenLoopType =
  | 'overdue'
  | 'unscheduled_task'
  | 'waiting_on'
  | 'unprocessed_idea'
  | 'unprocessed_note'
  | 'content_unscheduled'
  | 'project_no_next_task';

export interface OpenLoopItem {
  id: string;
  type: OpenLoopType;
  title: string;
  subtitle?: string;
  meta?: string;
  created_at?: string | null;
  link: string;
  badgeLabel: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function useOpenLoops() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['open-loops', user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<{
      items: OpenLoopItem[];
      counts: Record<OpenLoopType, number>;
    }> => {
      if (!user?.id) {
        return { items: [], counts: emptyCounts() };
      }
      const today = todayStr();

      const [
        overdueRes,
        unscheduledRes,
        waitingRes,
        ideasRes,
        notesRes,
        contentRes,
        projectsRes,
        projectTasksRes,
      ] = await Promise.all([
        // Overdue: scheduled in the past, not done
        supabase
          .from('tasks')
          .select('task_id, task_text, scheduled_date, project_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .eq('is_completed', false)
          .lt('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .limit(100),
        // Unscheduled: no scheduled date, no planned day, not someday/done
        supabase
          .from('tasks')
          .select('task_id, task_text, status, created_at, project_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .is('scheduled_date', null)
          .is('planned_day', null)
          .eq('is_completed', false)
          .neq('status', 'someday')
          .order('created_at', { ascending: false })
          .limit(100),
        // Waiting on
        supabase
          .from('tasks')
          .select('task_id, task_text, waiting_on, created_at')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .eq('status', 'waiting')
          .eq('is_completed', false)
          .order('created_at', { ascending: false })
          .limit(100),
        // Unprocessed ideas (no project, not deleted)
        supabase
          .from('ideas')
          .select('id, content, created_at, project_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .is('project_id', null)
          .order('created_at', { ascending: false })
          .limit(50),
        // Unprocessed notes (recent journal pages, no project)
        supabase
          .from('journal_pages')
          .select('id, title, content_preview, created_at, project_id')
          .eq('user_id', user.id)
          .is('is_archived', false)
          .is('project_id', null)
          .order('created_at', { ascending: false })
          .limit(50),
        // Content drafts not scheduled
        supabase
          .from('content_items')
          .select('id, title, type, channel, status, created_at')
          .eq('user_id', user.id)
          .neq('status', 'published')
          .is('planned_publish_date', null)
          .order('created_at', { ascending: false })
          .limit(50),
        // Active projects
        supabase
          .from('projects')
          .select('id, name, color, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(200),
        // Open tasks per project (to find empty ones)
        supabase
          .from('tasks')
          .select('project_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .eq('is_completed', false)
          .not('project_id', 'is', null)
          .limit(2000),
      ]);

      const items: OpenLoopItem[] = [];

      (overdueRes.data || []).forEach((t: any) => {
        items.push({
          id: `overdue-${t.task_id}`,
          type: 'overdue',
          title: t.task_text,
          subtitle: `Was due ${t.scheduled_date}`,
          link: `/tasks?focus=${t.task_id}`,
          badgeLabel: 'Overdue',
          created_at: t.scheduled_date,
        });
      });

      (unscheduledRes.data || []).forEach((t: any) => {
        items.push({
          id: `unscheduled-${t.task_id}`,
          type: 'unscheduled_task',
          title: t.task_text,
          subtitle: 'No date or planned day',
          link: `/tasks?focus=${t.task_id}`,
          badgeLabel: 'Unscheduled',
          created_at: t.created_at,
        });
      });

      (waitingRes.data || []).forEach((t: any) => {
        items.push({
          id: `waiting-${t.task_id}`,
          type: 'waiting_on',
          title: t.task_text,
          subtitle: t.waiting_on ? `Waiting on: ${t.waiting_on}` : 'Waiting on someone',
          link: `/tasks?focus=${t.task_id}`,
          badgeLabel: 'Waiting',
          created_at: t.created_at,
        });
      });

      (ideasRes.data || []).forEach((i: any) => {
        items.push({
          id: `idea-${i.id}`,
          type: 'unprocessed_idea',
          title: i.content?.slice(0, 140) || 'Untitled idea',
          subtitle: 'Not linked to a project',
          link: `/brain-dump`,
          badgeLabel: 'Idea',
          created_at: i.created_at,
        });
      });

      (notesRes.data || []).forEach((n: any) => {
        items.push({
          id: `note-${n.id}`,
          type: 'unprocessed_note',
          title: n.title || n.content_preview?.slice(0, 140) || 'Untitled note',
          subtitle: 'Not linked to a project',
          link: `/brain-dump`,
          badgeLabel: 'Note',
          created_at: n.created_at,
        });
      });

      (contentRes.data || []).forEach((c: any) => {
        items.push({
          id: `content-${c.id}`,
          type: 'content_unscheduled',
          title: c.title || 'Untitled content',
          subtitle: [c.type, c.channel].filter(Boolean).join(' · ') || 'Draft',
          link: `/content-vault`,
          badgeLabel: 'Draft',
          created_at: c.created_at,
        });
      });

      // Projects with no open tasks
      const openCounts = new Map<string, number>();
      (projectTasksRes.data || []).forEach((row: any) => {
        if (!row.project_id) return;
        openCounts.set(row.project_id, (openCounts.get(row.project_id) || 0) + 1);
      });
      (projectsRes.data || []).forEach((p: any) => {
        if (!openCounts.get(p.id)) {
          items.push({
            id: `project-${p.id}`,
            type: 'project_no_next_task',
            title: p.name,
            subtitle: 'Active project with no next task',
            link: `/projects/${p.id}`,
            badgeLabel: 'No next step',
          });
        }
      });

      const counts = emptyCounts();
      items.forEach((it) => {
        counts[it.type] += 1;
      });

      return { items, counts };
    },
  });
}

function emptyCounts(): Record<OpenLoopType, number> {
  return {
    overdue: 0,
    unscheduled_task: 0,
    waiting_on: 0,
    unprocessed_idea: 0,
    unprocessed_note: 0,
    content_unscheduled: 0,
    project_no_next_task: 0,
  };
}

export const OPEN_LOOP_GROUPS: { type: OpenLoopType; label: string; emoji: string; description: string }[] = [
  { type: 'overdue', label: 'Overdue tasks', emoji: '🔥', description: 'Past their scheduled date' },
  { type: 'unscheduled_task', label: 'Unscheduled tasks', emoji: '📥', description: 'No date or planned day' },
  { type: 'waiting_on', label: 'Waiting on someone', emoji: '⏳', description: 'Blocked on a reply or hand-off' },
  { type: 'unprocessed_idea', label: 'Unprocessed ideas', emoji: '💡', description: 'Not yet linked to a project' },
  { type: 'unprocessed_note', label: 'Unprocessed notes', emoji: '📝', description: 'Captured but not routed' },
  { type: 'content_unscheduled', label: 'Content drafts', emoji: '📅', description: 'Not yet on the calendar' },
  { type: 'project_no_next_task', label: 'Projects with no next task', emoji: '🚀', description: 'Active but stalled' },
];
