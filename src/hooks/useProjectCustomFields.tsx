import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomField {
  id: string;
  project_id: string;
  user_id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  field_options: string[];
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  task_id: string;
  field_id: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export function useProjectCustomFields(projectId: string) {
  return useQuery({
    queryKey: ['project-custom-fields', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_custom_fields')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as CustomField[];
    },
    enabled: !!projectId,
  });
}

export function useTaskCustomFieldValues(taskIds: string[]) {
  return useQuery({
    queryKey: ['task-custom-field-values', taskIds],
    queryFn: async () => {
      if (!taskIds.length) return {};
      
      const { data, error } = await supabase
        .from('task_custom_field_values')
        .select('*')
        .in('task_id', taskIds);

      if (error) throw error;
      
      // Group by task_id for easy lookup
      const grouped: Record<string, Record<string, any>> = {};
      (data || []).forEach((item: CustomFieldValue) => {
        if (!grouped[item.task_id]) grouped[item.task_id] = {};
        grouped[item.task_id][item.field_id] = item.value;
      });
      
      return grouped;
    },
    enabled: taskIds.length > 0,
  });
}

export function useCustomFieldMutations(projectId: string) {
  const queryClient = useQueryClient();

  const createField = useMutation({
    mutationFn: async (field: { field_name: string; field_type: string; field_options?: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('project_custom_fields')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from('project_custom_fields')
        .insert({
          project_id: projectId,
          user_id: user.id,
          field_name: field.field_name,
          field_type: field.field_type,
          field_options: field.field_options || [],
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-custom-fields', projectId] });
      toast.success('Custom field created');
    },
    onError: (error) => {
      toast.error('Failed to create field: ' + error.message);
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ fieldId, updates }: { fieldId: string; updates: Partial<CustomField> }) => {
      const { data, error } = await supabase
        .from('project_custom_fields')
        .update(updates)
        .eq('id', fieldId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-custom-fields', projectId] });
    },
  });

  const deleteField = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from('project_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-custom-fields', projectId] });
      toast.success('Custom field deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete field: ' + error.message);
    },
  });

  return { createField, updateField, deleteField };
}

export function useCustomFieldValueMutations() {
  const queryClient = useQueryClient();

  const updateFieldValue = useMutation({
    mutationFn: async ({ taskId, fieldId, value }: { taskId: string; fieldId: string; value: any }) => {
      const { data, error } = await supabase
        .from('task_custom_field_values')
        .upsert(
          { task_id: taskId, field_id: fieldId, value },
          { onConflict: 'task_id,field_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-custom-field-values'] });
    },
  });

  return { updateFieldValue };
}
