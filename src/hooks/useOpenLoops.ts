import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTaskMutations } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';

export type OpenLoopType =
  | 'overdue'
  | 'unscheduled_task'
  | 'waiting_on'
  | 'unprocessed_idea'
  | 'unprocessed_note'
  | 'content_unscheduled'
  | 'project_no_next_task'
  | 'course_no_task'
  | 'coaching_unresolved'
  | 'support_question';

export type OpenLoopBucket = 'do' | 'decide' | 'defer' | 'delete' | 'ask';

export interface OpenLoopItem {
  id: string;
  type: OpenLoopType;
  bucket: OpenLoopBucket;
  title: string;
  subtitle?: string;
  meta?: string;
  created_at?: string | null;
  link: string;
  badgeLabel: string;
  /** Source row id + table for action handlers. */
  sourceId: string;
  sourceTable: 'tasks' | 'ideas' | 'journal_pages' | 'content_items' | 'projects' | 'courses' | 'coaching_call_prep';
  /** Original text for convertToTask. */
  rawText?: string;
}

const TYPE_TO_BUCKET: Record<OpenLoopType, OpenLoopBucket> = {
  overdue: 'do',
  unscheduled_task: 'do',
  waiting_on: 'defer',
  unprocessed_idea: 'decide',
  unprocessed_note: 'decide',
  content_unscheduled: 'decide',
  project_no_next_task: 'decide',
  course_no_task: 'decide',
  coaching_unresolved: 'ask',
  support_question: 'ask',
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const dayOffsetStr = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export function useOpenLoops() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['open-loops', user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<{
      items: OpenLoopItem[];
      counts: Record<OpenLoopType, number>;
      bucketCounts: Record<OpenLoopBucket, number>;
    }> => {
      if (!user?.id) {
        return { items: [], counts: emptyCounts(), bucketCounts: emptyBucketCounts() };
      }
      const today = todayStr();
      const staleCutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const [
        overdueRes,
        unscheduledRes,
        waitingRes,
        ideasRes,
        notesRes,
        contentRes,
        projectsRes,
        projectTasksRes,
        coursesRes,
        courseTasksRes,
        coachingRes,
        supportNotesRes,
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('task_id, task_text, scheduled_date, project_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .eq('is_completed', false)
          .lt('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .limit(100),
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
        supabase
          .from('tasks')
          .select('task_id, task_text, waiting_on, created_at')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .eq('status', 'waiting')
          .eq('is_completed', false)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('ideas')
          .select('id, content, created_at, project_id, tags')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .is('project_id', null)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('journal_pages')
          .select('id, title, content_preview, created_at, project_id, tags')
          .eq('user_id', user.id)
          .is('is_archived', false)
          .is('project_id', null)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('content_items')
          .select('id, title, type, channel, status, created_at')
          .eq('user_id', user.id)
          .neq('status', 'published')
          .is('planned_publish_date', null)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('projects')
          .select('id, name, color, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(200),
        supabase
          .from('tasks')
          .select('project_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .eq('is_completed', false)
          .not('project_id', 'is', null)
          .limit(2000),
        supabase
          .from('courses')
          .select('id, title, status, intention')
          .eq('user_id', user.id)
          .in('status', ['in_progress', 'not_started'])
          .limit(100),
        supabase
          .from('tasks')
          .select('course_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .eq('is_completed', false)
          .not('course_id', 'is', null)
          .limit(2000),
        supabase
          .from('coaching_call_prep')
          .select('id, call_date, main_question, what_tried, blocking_thought, coaching_need, is_resolved, created_at')
          .eq('user_id', user.id)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('journal_pages')
          .select('id, title, content_preview, created_at, tags')
          .eq('user_id', user.id)
          .is('is_archived', false)
          .overlaps('tags', ['support', 'question'])
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const items: OpenLoopItem[] = [];
      const supportNoteIds = new Set((supportNotesRes.data || []).map((n: any) => n.id));

      (overdueRes.data || []).forEach((t: any) => {
        items.push({
          id: `overdue-${t.task_id}`,
          type: 'overdue',
          bucket: TYPE_TO_BUCKET.overdue,
          title: t.task_text,
          subtitle: `Was due ${t.scheduled_date}`,
          link: `/tasks?focus=${t.task_id}`,
          badgeLabel: 'Overdue',
          created_at: t.scheduled_date,
          sourceId: t.task_id,
          sourceTable: 'tasks',
          rawText: t.task_text,
        });
      });

      (unscheduledRes.data || []).forEach((t: any) => {
        items.push({
          id: `unscheduled-${t.task_id}`,
          type: 'unscheduled_task',
          bucket: TYPE_TO_BUCKET.unscheduled_task,
          title: t.task_text,
          subtitle: 'No date or planned day',
          link: `/tasks?focus=${t.task_id}`,
          badgeLabel: 'Unscheduled',
          created_at: t.created_at,
          sourceId: t.task_id,
          sourceTable: 'tasks',
          rawText: t.task_text,
        });
      });

      (waitingRes.data || []).forEach((t: any) => {
        items.push({
          id: `waiting-${t.task_id}`,
          type: 'waiting_on',
          bucket: TYPE_TO_BUCKET.waiting_on,
          title: t.task_text,
          subtitle: t.waiting_on ? `Waiting on: ${t.waiting_on}` : 'Waiting on someone',
          link: `/tasks?focus=${t.task_id}`,
          badgeLabel: 'Waiting',
          created_at: t.created_at,
          sourceId: t.task_id,
          sourceTable: 'tasks',
          rawText: t.task_text,
        });
      });

      (ideasRes.data || []).forEach((i: any) => {
        const isStale = i.created_at && i.created_at < staleCutoff;
        items.push({
          id: `idea-${i.id}`,
          type: 'unprocessed_idea',
          bucket: isStale ? 'delete' : TYPE_TO_BUCKET.unprocessed_idea,
          title: i.content?.slice(0, 140) || 'Untitled idea',
          subtitle: isStale ? 'Sitting >60 days — keep or clear?' : 'Not linked to a project',
          link: `/brain-dump`,
          badgeLabel: 'Idea',
          created_at: i.created_at,
          sourceId: i.id,
          sourceTable: 'ideas',
          rawText: i.content,
        });
      });

      (notesRes.data || []).forEach((n: any) => {
        if (supportNoteIds.has(n.id)) return; // shown in support bucket below
        const isStale = n.created_at && n.created_at < staleCutoff;
        items.push({
          id: `note-${n.id}`,
          type: 'unprocessed_note',
          bucket: isStale ? 'delete' : TYPE_TO_BUCKET.unprocessed_note,
          title: n.title || n.content_preview?.slice(0, 140) || 'Untitled note',
          subtitle: isStale ? 'Sitting >60 days — keep or clear?' : 'Not linked to a project',
          link: `/brain-dump`,
          badgeLabel: 'Note',
          created_at: n.created_at,
          sourceId: n.id,
          sourceTable: 'journal_pages',
          rawText: n.title || n.content_preview,
        });
      });

      (contentRes.data || []).forEach((c: any) => {
        items.push({
          id: `content-${c.id}`,
          type: 'content_unscheduled',
          bucket: TYPE_TO_BUCKET.content_unscheduled,
          title: c.title || 'Untitled content',
          subtitle: [c.type, c.channel].filter(Boolean).join(' · ') || 'Draft',
          link: `/editorial-calendar`,
          badgeLabel: 'Draft',
          created_at: c.created_at,
          sourceId: c.id,
          sourceTable: 'content_items',
          rawText: c.title,
        });
      });

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
            bucket: TYPE_TO_BUCKET.project_no_next_task,
            title: p.name,
            subtitle: 'Active project with no next task',
            link: `/projects/${p.id}`,
            badgeLabel: 'No next step',
            sourceId: p.id,
            sourceTable: 'projects',
            rawText: p.name,
          });
        }
      });

      // Courses with no open task
      const courseTaskCounts = new Map<string, number>();
      (courseTasksRes.data || []).forEach((row: any) => {
        if (!row.course_id) return;
        courseTaskCounts.set(row.course_id, (courseTaskCounts.get(row.course_id) || 0) + 1);
      });
      (coursesRes.data || []).forEach((c: any) => {
        if (!courseTaskCounts.get(c.id)) {
          items.push({
            id: `course-${c.id}`,
            type: 'course_no_task',
            bucket: TYPE_TO_BUCKET.course_no_task,
            title: c.title,
            subtitle: c.intention ? `Takeaway: ${c.intention.slice(0, 100)}` : 'No next study session or task',
            link: `/courses`,
            badgeLabel: 'Course',
            sourceId: c.id,
            sourceTable: 'courses',
            rawText: c.intention || c.title,
          });
        }
      });

      (coachingRes.data || []).forEach((c: any) => {
        const headline = c.main_question || c.coaching_need || c.blocking_thought || 'Open coaching prep';
        items.push({
          id: `coaching-${c.id}`,
          type: 'coaching_unresolved',
          bucket: TYPE_TO_BUCKET.coaching_unresolved,
          title: headline.slice(0, 200),
          subtitle: `Coaching prep · ${c.call_date}`,
          link: `/coach-prep`,
          badgeLabel: 'Coaching',
          created_at: c.created_at,
          sourceId: c.id,
          sourceTable: 'coaching_call_prep',
          rawText: headline,
        });
      });

      (supportNotesRes.data || []).forEach((n: any) => {
        items.push({
          id: `support-${n.id}`,
          type: 'support_question',
          bucket: TYPE_TO_BUCKET.support_question,
          title: n.title || n.content_preview?.slice(0, 140) || 'Open question',
          subtitle: 'Tagged for support',
          link: `/brain-dump`,
          badgeLabel: 'Support',
          created_at: n.created_at,
          sourceId: n.id,
          sourceTable: 'journal_pages',
          rawText: n.title || n.content_preview,
        });
      });

      const counts = emptyCounts();
      const bucketCounts = emptyBucketCounts();
      items.forEach((it) => {
        counts[it.type] += 1;
        bucketCounts[it.bucket] += 1;
      });

      return { items, counts, bucketCounts };
    },
  });
}

export function useOpenLoopActions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createTask, updateTask } = useTaskMutations();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['open-loops'] });
    queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['ideas'] });
    queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
  };

  /** Schedule a task to a specific date. */
  const schedule = useMutation({
    mutationFn: async ({ item, when }: { item: OpenLoopItem; when: 'today' | 'tomorrow' | 'next_week' }) => {
      if (!user) throw new Error('Not authenticated');
      const date = when === 'today' ? todayStr() : when === 'tomorrow' ? dayOffsetStr(1) : dayOffsetStr(7);
      if (item.sourceTable === 'tasks') {
        await updateTask.mutateAsync({ taskId: item.sourceId, updates: { scheduled_date: date, status: 'scheduled' } as any });
        return;
      }
      if (item.sourceTable === 'content_items') {
        const { error } = await supabase
          .from('content_items')
          .update({ planned_publish_date: date })
          .eq('id', item.sourceId).eq('user_id', user.id);
        if (error) throw error;
        return;
      }
      // For non-task items (ideas/notes/courses/coaching), create a follow-up task on that date.
      await createTask.mutateAsync({
        task_text: item.rawText || item.title,
        scheduled_date: date,
        source: 'open_loops',
      } as any);
    },
    onSuccess: () => {
      toast({ title: 'Scheduled' });
      invalidateAll();
    },
    onError: (err: any) => toast({ title: 'Schedule failed', description: err.message, variant: 'destructive' }),
  });

  /** Convert any non-task item into a task (preserves original). */
  const convertToTask = useMutation({
    mutationFn: async (item: OpenLoopItem) => {
      if (!user) throw new Error('Not authenticated');
      await createTask.mutateAsync({
        task_text: item.rawText || item.title,
        scheduled_date: todayStr(),
        source: 'open_loops',
      } as any);
    },
    onSuccess: () => {
      toast({ title: 'Converted to task' });
      invalidateAll();
    },
    onError: (err: any) => toast({ title: 'Convert failed', description: err.message, variant: 'destructive' }),
  });

  /** Soft-archive / dismiss an item (uses existing per-table soft-delete patterns). */
  const archive = useMutation({
    mutationFn: async (item: OpenLoopItem) => {
      if (!user) throw new Error('Not authenticated');
      switch (item.sourceTable) {
        case 'tasks': {
          const { error } = await supabase
            .from('tasks')
            .update({ status: 'someday' })
            .eq('task_id', item.sourceId).eq('user_id', user.id);
          if (error) throw error;
          return;
        }
        case 'ideas': {
          const { error } = await supabase
            .from('ideas')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', item.sourceId).eq('user_id', user.id);
          if (error) throw error;
          return;
        }
        case 'journal_pages': {
          const { error } = await supabase
            .from('journal_pages')
            .update({ is_archived: true })
            .eq('id', item.sourceId).eq('user_id', user.id);
          if (error) throw error;
          return;
        }
        case 'content_items': {
          const { error } = await supabase
            .from('content_items')
            .update({ status: 'Archived' })
            .eq('id', item.sourceId).eq('user_id', user.id);
          if (error) throw error;
          return;
        }
        case 'coaching_call_prep': {
          const { error } = await supabase
            .from('coaching_call_prep')
            .update({ is_resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', item.sourceId).eq('user_id', user.id);
          if (error) throw error;
          return;
        }
        default:
          throw new Error('Cannot archive this item from here');
      }
    },
    onSuccess: () => {
      toast({ title: 'Cleared from your loops' });
      invalidateAll();
    },
    onError: (err: any) => toast({ title: 'Action failed', description: err.message, variant: 'destructive' }),
  });

  /** Link an idea/note/task to a project. */
  const linkToProject = useMutation({
    mutationFn: async ({ item, projectId }: { item: OpenLoopItem; projectId: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (item.sourceTable === 'tasks') {
        await updateTask.mutateAsync({ taskId: item.sourceId, updates: { project_id: projectId } as any });
        return;
      }
      if (item.sourceTable === 'ideas') {
        const { error } = await supabase
          .from('ideas')
          .update({ project_id: projectId })
          .eq('id', item.sourceId).eq('user_id', user.id);
        if (error) throw error;
        return;
      }
      if (item.sourceTable === 'journal_pages') {
        const { error } = await supabase
          .from('journal_pages')
          .update({ project_id: projectId })
          .eq('id', item.sourceId).eq('user_id', user.id);
        if (error) throw error;
        return;
      }
      if (item.sourceTable === 'content_items') {
        const { error } = await supabase
          .from('content_items')
          .update({ project_id: projectId })
          .eq('id', item.sourceId).eq('user_id', user.id);
        if (error) throw error;
        return;
      }
      throw new Error('Cannot link this item to a project');
    },
    onSuccess: () => {
      toast({ title: 'Linked to project' });
      invalidateAll();
    },
    onError: (err: any) => toast({ title: 'Link failed', description: err.message, variant: 'destructive' }),
  });

  return { schedule, convertToTask, archive, linkToProject };
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
    course_no_task: 0,
    coaching_unresolved: 0,
    support_question: 0,
  };
}

function emptyBucketCounts(): Record<OpenLoopBucket, number> {
  return { do: 0, decide: 0, defer: 0, delete: 0, ask: 0 };
}

export const OPEN_LOOP_GROUPS: { type: OpenLoopType; label: string; emoji: string; description: string }[] = [
  { type: 'overdue', label: 'Overdue tasks', emoji: '🔥', description: 'Past their scheduled date' },
  { type: 'unscheduled_task', label: 'Unscheduled tasks', emoji: '📥', description: 'No date or planned day' },
  { type: 'waiting_on', label: 'Waiting on someone', emoji: '⏳', description: 'Blocked on a reply or hand-off' },
  { type: 'unprocessed_idea', label: 'Unprocessed ideas', emoji: '💡', description: 'Not yet linked to a project' },
  { type: 'unprocessed_note', label: 'Unprocessed notes', emoji: '📝', description: 'Captured but not routed' },
  { type: 'content_unscheduled', label: 'Content drafts', emoji: '📅', description: 'Not yet on the calendar' },
  { type: 'project_no_next_task', label: 'Projects with no next task', emoji: '🚀', description: 'Active but stalled' },
  { type: 'course_no_task', label: 'Courses with no next step', emoji: '🎓', description: 'Course takeaways without action' },
  { type: 'coaching_unresolved', label: 'Open coaching questions', emoji: '🆘', description: 'Not yet resolved' },
  { type: 'support_question', label: 'Support questions', emoji: '❓', description: 'Tagged in your brain dump' },
];

export const OPEN_LOOP_BUCKETS: { bucket: OpenLoopBucket; label: string; emoji: string; description: string; tone: string }[] = [
  { bucket: 'do',     label: 'Do',     emoji: '⚡', description: 'Take action this week.',                  tone: 'border-l-primary/70' },
  { bucket: 'decide', label: 'Decide', emoji: '🧭', description: 'Route it to a project, task, or calendar.', tone: 'border-l-amber-500/70' },
  { bucket: 'defer',  label: 'Defer',  emoji: '⏳', description: 'Waiting on someone — review later.',        tone: 'border-l-cyan-500/70' },
  { bucket: 'delete', label: 'Delete', emoji: '🧹', description: 'Old captures — keep or clear?',             tone: 'border-l-slate-400/70' },
  { bucket: 'ask',    label: 'Ask for Support', emoji: '🆘', description: 'Bring to coaching or support.',    tone: 'border-l-rose-500/70' },
];
