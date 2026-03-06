import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTaskMutations } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';

export type BrainDumpCategory = 'note' | 'idea' | 'task' | 'project';

export interface BrainDumpItem {
  id: string;
  text: string;
  category: BrainDumpCategory;
  created_at: string;
  updated_at: string | null;
  // Source table reference
  source_table: 'journal_pages' | 'ideas' | 'tasks';
  // Extra metadata
  project_id?: string | null;
  project_name?: string | null;
  priority?: string | null;
  tags?: string[];
  is_completed?: boolean;
}

const CATEGORY_COLORS: Record<BrainDumpCategory, string> = {
  note: 'hsl(48, 96%, 89%)',    // yellow
  idea: 'hsl(270, 50%, 90%)',   // purple
  task: 'hsl(210, 80%, 90%)',   // blue
  project: 'hsl(142, 60%, 88%)', // green
};

export const getCategoryColor = (cat: BrainDumpCategory) => CATEGORY_COLORS[cat];

export const CATEGORY_CONFIG: Record<BrainDumpCategory, { label: string; emoji: string; bgClass: string; borderClass: string }> = {
  note: { label: 'Notes', emoji: '📝', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30', borderClass: 'border-yellow-300 dark:border-yellow-700' },
  idea: { label: 'Ideas', emoji: '💡', bgClass: 'bg-purple-100 dark:bg-purple-900/30', borderClass: 'border-purple-300 dark:border-purple-700' },
  task: { label: 'Tasks', emoji: '✅', bgClass: 'bg-blue-100 dark:bg-blue-900/30', borderClass: 'border-blue-300 dark:border-blue-700' },
  project: { label: 'Projects', emoji: '🚀', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-green-300 dark:border-green-700' },
};

export function useBrainDump() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { createTask } = useTaskMutations();

  const query = useQuery({
    queryKey: ['brain-dump', user?.id],
    queryFn: async (): Promise<BrainDumpItem[]> => {
      if (!user) return [];

      // Fetch from all 3 tables in parallel
      const [notesRes, ideasRes, tasksRes] = await Promise.all([
        supabase
          .from('journal_pages')
          .select('id, title, content, created_at, updated_at, project_id, tags')
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

      // Map journal pages → notes
      (notesRes.data || []).forEach(n => {
        items.push({
          id: n.id,
          text: n.title || n.content || '',
          category: 'note',
          created_at: n.created_at || new Date().toISOString(),
          updated_at: n.updated_at,
          source_table: 'journal_pages',
          project_id: n.project_id,
          tags: Array.isArray(n.tags) ? (n.tags as string[]) : [],
        });
      });

      // Map ideas → ideas or projects
      (ideasRes.data || []).forEach(i => {
        items.push({
          id: i.id,
          text: i.content,
          category: i.project_id ? 'project' : 'idea',
          created_at: i.created_at || new Date().toISOString(),
          updated_at: i.updated_at,
          source_table: 'ideas',
          project_id: i.project_id,
          priority: i.priority,
          tags: Array.isArray(i.tags) ? i.tags : [],
        });
      });

      // Map tasks
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

      // Deduplicate by id
      const seen = new Set<string>();
      return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    },
    enabled: !!user,
  });

  const createItem = useMutation({
    mutationFn: async ({ text, category }: { text: string; category: BrainDumpCategory }) => {
      if (!user) throw new Error('Not authenticated');
      const trimmed = text.trim();
      if (!trimmed) throw new Error('Text is required');

      if (category === 'note') {
        const { data, error } = await supabase
          .from('journal_pages')
          .insert({ user_id: user.id, title: trimmed, content: trimmed })
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      if (category === 'idea' || category === 'project') {
        const { data, error } = await supabase
          .from('ideas')
          .insert({
            user_id: user.id,
            content: trimmed,
            project_id: null, // project linking can be done after
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      if (category === 'task') {
        // Use the centralized task mutation
        await createTask.mutateAsync({
          task_text: trimmed,
          source: 'brain_dump',
          scheduled_date: new Date().toISOString().split('T')[0],
        });
        return { id: 'new' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast({ title: 'Note created' });
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
      toast({ title: 'Note removed' });
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

  const convertCategory = useMutation({
    mutationFn: async ({ item, newCategory }: { item: BrainDumpItem; newCategory: BrainDumpCategory }) => {
      if (!user) throw new Error('Not authenticated');
      const text = item.text;

      // 1. Delete from old table (soft delete)
      if (item.source_table === 'journal_pages') {
        await supabase.from('journal_pages').update({ is_archived: true }).eq('id', item.id).eq('user_id', user.id);
      } else if (item.source_table === 'ideas') {
        await supabase.from('ideas').update({ deleted_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', user.id);
      } else if (item.source_table === 'tasks') {
        await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('task_id', item.id).eq('user_id', user.id);
      }

      // 2. Insert into new table
      if (newCategory === 'note') {
        await supabase.from('journal_pages').insert({ user_id: user.id, title: text, content: text });
      } else if (newCategory === 'idea' || newCategory === 'project') {
        await supabase.from('ideas').insert({ user_id: user.id, content: text });
      } else if (newCategory === 'task') {
        await createTask.mutateAsync({ task_text: text, source: 'brain_dump', scheduled_date: new Date().toISOString().split('T')[0] });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain-dump'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      toast({ title: 'Category changed' });
    },
    onError: (err: any) => {
      toast({ title: 'Error converting', description: err.message, variant: 'destructive' });
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createItem,
    deleteItem,
    updateItem,
    convertCategory,
  };
}
