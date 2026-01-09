import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProjectBoard, BoardColumn, Project } from '@/types/project';
import { toast } from 'sonner';

export const boardQueryKeys = {
  boards: ['project-boards'] as const,
  columns: (boardId: string) => ['board-columns', boardId] as const,
  boardProjects: (boardId: string) => ['board-projects', boardId] as const,
};

export function useProjectBoards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: boardQueryKeys.boards,
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('project_boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProjectBoard[];
    },
    enabled: !!user,
  });
}

export function useBoardColumns(boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: boardQueryKeys.columns(boardId || ''),
    queryFn: async () => {
      if (!user || !boardId) throw new Error('No user or board');

      const { data, error } = await supabase
        .from('project_columns')
        .select('*')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as BoardColumn[];
    },
    enabled: !!user && !!boardId,
  });
}

export function useBoardProjects(boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: boardQueryKeys.boardProjects(boardId || ''),
    queryFn: async () => {
      if (!user || !boardId) throw new Error('No user or board');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('board_id', boardId)
        .order('board_sort_order', { ascending: true });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user && !!boardId,
  });
}

export function useBoardMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createBoard = useMutation({
    mutationFn: async ({ name, columns }: { name: string; columns: { name: string; color: string }[] }) => {
      if (!user) throw new Error('No user');

      // Create board
      const { data: board, error: boardError } = await supabase
        .from('project_boards')
        .insert({ user_id: user.id, name, is_default: false })
        .select()
        .single();

      if (boardError) throw boardError;

      // Create columns
      const columnsToInsert = columns.map((col, idx) => ({
        board_id: board.id,
        user_id: user.id,
        name: col.name,
        color: col.color,
        sort_order: idx,
      }));

      const { error: colError } = await supabase
        .from('project_columns')
        .insert(columnsToInsert);

      if (colError) throw colError;

      return board as ProjectBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boards });
      toast.success('Board created');
    },
    onError: () => {
      toast.error('Failed to create board');
    },
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, name, is_default }: Partial<ProjectBoard> & { id: string }) => {
      if (!user) throw new Error('No user');

      // If setting as default, unset other defaults first
      if (is_default) {
        await supabase
          .from('project_boards')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('project_boards')
        .update({ name, is_default })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boards });
      toast.success('Board updated');
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (boardId: string) => {
      if (!user) throw new Error('No user');

      // Get default board to move projects to
      const { data: defaultBoard } = await supabase
        .from('project_boards')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .neq('id', boardId)
        .single();

      if (defaultBoard) {
        // Get first column of default board
        const { data: firstColumn } = await supabase
          .from('project_columns')
          .select('id')
          .eq('board_id', defaultBoard.id)
          .order('sort_order', { ascending: true })
          .limit(1)
          .single();

        // Move projects to default board
        await supabase
          .from('projects')
          .update({ 
            board_id: defaultBoard.id, 
            column_id: firstColumn?.id || null,
            board_sort_order: 0 
          })
          .eq('board_id', boardId);
      }

      const { error } = await supabase
        .from('project_boards')
        .delete()
        .eq('id', boardId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boards });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Board deleted');
    },
  });

  const createDefaultBoard = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase.rpc('create_default_project_board', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boards });
    },
  });

  return { createBoard, updateBoard, deleteBoard, createDefaultBoard };
}

export function useColumnMutations(boardId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createColumn = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error('No user');

      // Get max sort_order
      const { data: existing } = await supabase
        .from('project_columns')
        .select('sort_order')
        .eq('board_id', boardId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

      const { data, error } = await supabase
        .from('project_columns')
        .insert({
          board_id: boardId,
          user_id: user.id,
          name,
          color,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BoardColumn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.columns(boardId) });
      toast.success('Column added');
    },
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      if (!user) throw new Error('No user');

      const updates: Partial<BoardColumn> = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;

      const { data, error } = await supabase
        .from('project_columns')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as BoardColumn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.columns(boardId) });
    },
  });

  const deleteColumn = useMutation({
    mutationFn: async (columnId: string) => {
      if (!user) throw new Error('No user');

      // Get first column (to move projects to)
      const { data: firstColumn } = await supabase
        .from('project_columns')
        .select('id')
        .eq('board_id', boardId)
        .neq('id', columnId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      // Move projects to first column
      if (firstColumn) {
        await supabase
          .from('projects')
          .update({ column_id: firstColumn.id })
          .eq('column_id', columnId);
      }

      const { error } = await supabase
        .from('project_columns')
        .delete()
        .eq('id', columnId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.columns(boardId) });
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boardProjects(boardId) });
      toast.success('Column deleted');
    },
  });

  const reorderColumns = useMutation({
    mutationFn: async (columns: { id: string; sort_order: number }[]) => {
      if (!user) throw new Error('No user');

      const updates = columns.map((col) =>
        supabase
          .from('project_columns')
          .update({ sort_order: col.sort_order })
          .eq('id', col.id)
          .eq('user_id', user.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.columns(boardId) });
    },
  });

  return { createColumn, updateColumn, deleteColumn, reorderColumns };
}

export function useProjectBoardMutations(boardId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const moveProject = useMutation({
    mutationFn: async ({ projectId, columnId, sortOrder }: { projectId: string; columnId: string; sortOrder: number }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('projects')
        .update({ column_id: columnId, board_sort_order: sortOrder })
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boardProjects(boardId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const addProjectToBoard = useMutation({
    mutationFn: async ({ projectId, columnId }: { projectId: string; columnId: string }) => {
      if (!user) throw new Error('No user');

      // Get max sort order in column
      const { data: existing } = await supabase
        .from('projects')
        .select('board_sort_order')
        .eq('column_id', columnId)
        .order('board_sort_order', { ascending: false })
        .limit(1);

      const nextOrder = existing && existing.length > 0 ? (existing[0].board_sort_order || 0) + 1 : 0;

      const { data, error } = await supabase
        .from('projects')
        .update({ board_id: boardId, column_id: columnId, board_sort_order: nextOrder })
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boardProjects(boardId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project added to board');
    },
  });

  const reorderProjects = useMutation({
    mutationFn: async (projects: { id: string; column_id: string; board_sort_order: number }[]) => {
      if (!user) throw new Error('No user');

      const updates = projects.map((proj) =>
        supabase
          .from('projects')
          .update({ column_id: proj.column_id, board_sort_order: proj.board_sort_order })
          .eq('id', proj.id)
          .eq('user_id', user.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardQueryKeys.boardProjects(boardId) });
    },
  });

  return { moveProject, addProjectToBoard, reorderProjects };
}
