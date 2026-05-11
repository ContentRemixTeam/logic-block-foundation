import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTaskMutations } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { routeForLine, extractTags } from '@/lib/captureTags';

/**
 * Universal capture inbox categories.
 * Underlying storage uses 3 existing tables (journal_pages, ideas, tasks).
 * Extended categories (content/question/win/mindset/later) live as TAGS
 * on the appropriate row — no schema changes.
 */
export type BrainDumpCategory =
  | 'note'
  | 'idea'
  | 'task'
  | 'project'
  | 'content'
  | 'question'
  | 'win'
  | 'mindset'
  | 'later';

export interface BrainDumpItem {
  id: string;
  text: string;
  category: BrainDumpCategory;
  created_at: string;
  updated_at: string | null;
  source_table: 'journal_pages' | 'ideas' | 'tasks';
  project_id?: string | null;
  project_name?: string | null;
  priority?: string | null;
  tags?: string[];
  is_completed?: boolean;
  /** True if this came in untagged (raw note) — used for the Review queue. */
  unprocessed?: boolean;
}

const CATEGORY_COLORS: Record<BrainDumpCategory, string> = {
  note:     'hsl(48, 96%, 89%)',
  idea:     'hsl(270, 50%, 90%)',
  task:     'hsl(210, 80%, 90%)',
  project:  'hsl(142, 60%, 88%)',
  content:  'hsl(330, 70%, 90%)',
  question: 'hsl(20, 90%, 90%)',
  win:      'hsl(45, 95%, 85%)',
  mindset:  'hsl(190, 60%, 88%)',
  later:    'hsl(220, 15%, 88%)',
};

export const getCategoryColor = (cat: BrainDumpCategory) => CATEGORY_COLORS[cat];

export const CATEGORY_CONFIG: Record<BrainDumpCategory, { label: string; emoji: string; bgClass: string; borderClass: string }> = {
  note:     { label: 'Notes',     emoji: '📝', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', borderClass: 'border-yellow-300 dark:border-yellow-700' },
  idea:     { label: 'Ideas',     emoji: '💡', bgClass: 'bg-purple-100 dark:bg-purple-900/30', borderClass: 'border-purple-300 dark:border-purple-700' },
  task:     { label: 'Tasks',     emoji: '✅', bgClass: 'bg-blue-100 dark:bg-blue-900/30',     borderClass: 'border-blue-300 dark:border-blue-700' },
  project:  { label: 'Projects',  emoji: '🚀', bgClass: 'bg-green-100 dark:bg-green-900/30',   borderClass: 'border-green-300 dark:border-green-700' },
  content:  { label: 'Content',   emoji: '✍️', bgClass: 'bg-pink-100 dark:bg-pink-900/30',     borderClass: 'border-pink-300 dark:border-pink-700' },
  question: { label: 'Questions', emoji: '❓', bgClass: 'bg-orange-100 dark:bg-orange-900/30', borderClass: 'border-orange-300 dark:border-orange-700' },
  win:      { label: 'Wins',      emoji: '🏆', bgClass: 'bg-amber-100 dark:bg-amber-900/30',   borderClass: 'border-amber-300 dark:border-amber-700' },
  mindset:  { label: 'Mindset',   emoji: '🧘', bgClass: 'bg-cyan-100 dark:bg-cyan-900/30',     borderClass: 'border-cyan-300 dark:border-cyan-700' },
  later:    { label: 'Later',     emoji: '⏳', bgClass: 'bg-slate-100 dark:bg-slate-800/40',   borderClass: 'border-slate-300 dark:border-slate-700' },
};

/** Default destination order — first match wins when deriving category from row tags. */
const TAG_TO_CATEGORY: Array<[string, BrainDumpCategory]> = [
  ['win', 'win'],
  ['mindset', 'mindset'],
  ['later', 'later'],
  ['question', 'question'],
  ['support', 'question'],
  ['content', 'content'],
];

function deriveCategoryFromTags(rowTags: string[] | undefined, fallback: BrainDumpCategory): BrainDumpCategory {
  if (!rowTags || rowTags.length === 0) return fallback;
  const lower = rowTags.map(t => String(t).toLowerCase());
  for (const [tag, cat] of TAG_TO_CATEGORY) {
    if (lower.includes(tag)) return cat;
  }
  return fallback;
}

/** Map an extended category to the underlying storage destination. */
function targetTableFor(cat: BrainDumpCategory): 'journal_pages' | 'ideas' | 'tasks' {
  if (cat === 'task') return 'tasks';
  if (cat === 'idea' || cat === 'project' || cat === 'content') return 'ideas';
  return 'journal_pages'; // note, question, win, mindset, later
}

/** Persisted tag value to write so the row maps back to its category on read. */
function tagFor(cat: BrainDumpCategory): string | null {
  switch (cat) {
    case 'content':
    case 'question':
    case 'win':
    case 'mindset':
    case 'later':
      return cat;
    default:
      return null;
  }
}

export function useBrainDump() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { createTask } = useTaskMutations();

  const query = useQuery({
    queryKey: ['brain-dump', user?.id],
    queryFn: async (): Promise<BrainDumpItem[]> => {
      if (!user) return [];

      const [notesRes, ideasRes, tasksRes] = await Promise.all([
        supabase
          .from('journal_pages')
          .select('id, title, content_preview, created_at, updated_at, project_id, tags')
          .eq('user_id', user.id)
          .is('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('ideas')
          .select('id, content, created_at, updated_at, project_id, priority, tags')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('tasks')
          .select('task_id, task_text, created_at, updated_at, project_id, priority, is_completed, source')
          .eq('user_id', user.id)
          .eq('source', 'brain_dump')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      const items: BrainDumpItem[] = [];

      (notesRes.data || []).forEach(n => {
        const tags = Array.isArray(n.tags) ? (n.tags as string[]) : [];
        const cat = deriveCategoryFromTags(tags, 'note');
        items.push({
          id: n.id,
          text: n.title || (n as any).content_preview || '',
          category: cat,
          created_at: n.created_at || new Date().toISOString(),
          updated_at: n.updated_at,
          source_table: 'journal_pages',
          project_id: n.project_id,
          tags,
          unprocessed: cat === 'note' && tags.length === 0,
        });
      });

      (ideasRes.data || []).forEach(i => {
        const tags = Array.isArray(i.tags) ? (i.tags as string[]) : [];
        const baseFallback: BrainDumpCategory = i.project_id ? 'project' : 'idea';
        const cat = deriveCategoryFromTags(tags, baseFallback);
        items.push({
          id: i.id,
          text: i.content,
          category: cat,
          created_at: i.created_at || new Date().toISOString(),
          updated_at: i.updated_at,
          source_table: 'ideas',
          project_id: i.project_id,
          priority: i.priority,
          tags,
        });
      });

      (tasksRes.data || []).forEach(t => {
        items.push({
          id: t.task_id,
          text: t.task_text,
          category: 'task',
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at,
          source_table: 'tasks',
          project_id: t.project_id,
          priority: t.priority,
          is_completed: t.is_completed ?? false,
        });
      });

      const seen = new Set<string>();
      return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    },
    enabled: !!user,
  });

  /** Insert one item into the right backing table for a given extended category. */
  async function insertForCategory(text: string, category: BrainDumpCategory, extraTags: string[] = []) {
    if (!user) throw new Error('Not authenticated');
    const tag = tagFor(category);
    const tags = Array.from(new Set([...(tag ? [tag] : []), ...extraTags.map(t => t.toLowerCase())]));
    const table = targetTableFor(category);

    if (table === 'journal_pages') {
      const { error } = await supabase
        .from('journal_pages')
        .insert({ user_id: user.id, title: text, content: text, tags });
      if (error) throw error;
      return;
    }
    if (table === 'ideas') {
      const { error } = await supabase
        .from('ideas')
        .insert({ user_id: user.id, content: text, project_id: null, tags });
      if (error) throw error;
      return;
    }
    // tasks
    await createTask.mutateAsync({
      task_text: text,
      source: 'brain_dump',
      scheduled_date: new Date().toISOString().split('T')[0],
    });
  }

  const createItem = useMutation({
    mutationFn: async ({ text, category }: { text: string; category: BrainDumpCategory }) => {
      const trimmed = text.trim();
      if (!trimmed) throw new Error('Text is required');
      await insertForCategory(trimmed, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast({ title: 'Captured' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (item: BrainDumpItem) => {
      if (!user) throw new Error('Not authenticated');
      if (item.source_table === 'journal_pages') {
        const { error } = await supabase
          .from('journal_pages')
          .update({ is_archived: true })
          .eq('id', item.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else if (item.source_table === 'ideas') {
        const { error } = await supabase
          .from('ideas')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else if (item.source_table === 'tasks') {
        const { error } = await supabase
          .from('tasks')
          .update({ deleted_at: new Date().toISOString() })
          .eq('task_id', item.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast({ title: 'Removed' });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ item, newText }: { item: BrainDumpItem; newText: string }) => {
      if (!user) throw new Error('Not authenticated');
      const trimmed = newText.trim();
      if (item.source_table === 'journal_pages') {
        const { error } = await supabase
          .from('journal_pages')
          .update({ title: trimmed, content: trimmed, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else if (item.source_table === 'ideas') {
        const { error } = await supabase
          .from('ideas')
          .update({ content: trimmed, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else if (item.source_table === 'tasks') {
        const { error } = await supabase
          .from('tasks')
          .update({ task_text: trimmed, updated_at: new Date().toISOString() })
          .eq('task_id', item.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });

  /**
   * Reclassify an item to a new category.
   * Same backing table → just update tags (preserves the row).
   * Different table → create new + soft-archive original.
   */
  const convertCategory = useMutation({
    mutationFn: async ({ item, newCategory }: { item: BrainDumpItem; newCategory: BrainDumpCategory }) => {
      if (!user) throw new Error('Not authenticated');
      if (item.category === newCategory) return;

      const newTable = targetTableFor(newCategory);

      // Same-table reclassification → patch tags only.
      if (newTable === item.source_table && item.source_table !== 'tasks') {
        const cleanTags = (item.tags || []).filter(t => {
          const l = String(t).toLowerCase();
          return !TAG_TO_CATEGORY.some(([key]) => key === l);
        });
        const newTag = tagFor(newCategory);
        const nextTags = newTag ? [...cleanTags, newTag] : cleanTags;

        if (item.source_table === 'journal_pages') {
          const { error } = await supabase
            .from('journal_pages')
            .update({ tags: nextTags })
            .eq('id', item.id).eq('user_id', user.id);
          if (error) throw error;
          return;
        }
        if (item.source_table === 'ideas') {
          const { error } = await supabase
            .from('ideas')
            .update({ tags: nextTags })
            .eq('id', item.id).eq('user_id', user.id);
          if (error) throw error;
          return;
        }
      }

      // Cross-table conversion → insert new, soft-archive original (preserves history).
      await insertForCategory(item.text, newCategory);
      if (item.source_table === 'journal_pages') {
        await supabase.from('journal_pages').update({ is_archived: true }).eq('id', item.id).eq('user_id', user.id);
      } else if (item.source_table === 'ideas') {
        await supabase.from('ideas').update({ deleted_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', user.id);
      } else if (item.source_table === 'tasks') {
        await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('task_id', item.id).eq('user_id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast({ title: 'Moved' });
    },
    onError: (err: any) => {
      toast({ title: 'Error converting', description: err.message, variant: 'destructive' });
    },
  });

  const createItemsFromText = useMutation({
    mutationFn: async ({ raw, fallback = 'note' }: { raw: string; fallback?: BrainDumpCategory }) => {
      if (!user) throw new Error('Not authenticated');
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const failed: string[] = [];
      let saved = 0;
      for (const line of lines) {
        // base destination from captureTags (task/idea/project/note)
        const baseFallback: 'note' | 'idea' | 'task' | 'project' =
          (['note', 'idea', 'task', 'project'] as const).includes(fallback as any)
            ? (fallback as any)
            : 'note';
        const routed = routeForLine(line, baseFallback);
        const text = routed.cleanedText || line;
        const allTags = extractTags(line).map(t => t.toLowerCase());

        // Promote to extended category if a special tag is present.
        let category: BrainDumpCategory = routed.destination;
        for (const [tag, cat] of TAG_TO_CATEGORY) {
          if (allTags.includes(tag)) {
            category = cat;
            break;
          }
        }
        // If user used the fallback dropdown to pick an extended category, honor it.
        if (category === routed.destination && fallback !== baseFallback) {
          category = fallback;
        }

        try {
          await insertForCategory(text, category, allTags);
          saved++;
        } catch (err) {
          console.error('createItemsFromText line failed:', err);
          failed.push(line);
        }
      }
      return { saved, failed, total: lines.length };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      if (res.failed.length === 0) {
        toast({ title: res.saved === 1 ? 'Captured' : `Captured ${res.saved} items` });
      } else {
        toast({
          title: `Saved ${res.saved} of ${res.total}`,
          description: `${res.failed.length} line(s) kept in the box to retry.`,
          variant: 'destructive',
        });
      }
    },
    onError: (err: any) => {
      toast({ title: 'Capture failed', description: err.message, variant: 'destructive' });
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createItem,
    createItemsFromText,
    deleteItem,
    updateItem,
    convertCategory,
  };
}
