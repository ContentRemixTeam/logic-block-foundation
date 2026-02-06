import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ProjectDesignerData, DEFAULT_PROJECT_DESIGNER_DATA } from '@/types/projectDesigner';
import { USE_CASE_TEMPLATES, BASE_FIELDS } from '@/lib/projectDesignerTemplates';

export function useProjectDesigner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const createBoard = useCallback(async (data: ProjectDesignerData) => {
    if (!user) {
      toast.error('Please sign in to create a board');
      return null;
    }

    setIsCreating(true);

    try {
      // Get session for edge function call
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No session');
      }

      // Call the edge function
      const response = await supabase.functions.invoke('create-custom-board', {
        body: {
          name: data.boardName,
          columns: data.columns.map(c => ({ name: c.name, color: c.color })),
          fields: data.fields.filter(f => f.key !== 'name' && f.key !== 'description'),
          settings: data.settings,
          saveAsTemplate: data.saveAsTemplate,
          templateName: data.templateName || undefined,
          useCase: data.useCase,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;
      
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to create board');
      }

      toast.success('Board created successfully!');
      
      // Navigate to the new board
      navigate(`/projects?board=${result.board_id}`);
      
      return result.board_id;
    } catch (error: any) {
      console.error('Error creating board:', error);
      toast.error(error.message || 'Failed to create board');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user, navigate]);

  const applyTemplate = useCallback((useCase: ProjectDesignerData['useCase']): Partial<ProjectDesignerData> => {
    const template = USE_CASE_TEMPLATES[useCase];
    if (!template) return {};

    // Always include base fields (name, description, due_date, priority) + template suggested fields
    // Filter out any template fields that would duplicate base field keys
    const baseFieldKeys = new Set(BASE_FIELDS.map(f => f.key));
    const suggestedFieldsWithoutDupes = template.suggestedFields.filter(f => !baseFieldKeys.has(f.key));

    return {
      columns: template.columns,
      // Combine base fields with template-specific suggested fields
      fields: [...BASE_FIELDS, ...suggestedFieldsWithoutDupes],
      boardName: template.defaultBoardName,
      settings: {
        ...DEFAULT_PROJECT_DESIGNER_DATA.settings,
        ...template.defaultSettings,
      },
    };
  }, []);

  return {
    createBoard,
    applyTemplate,
    isCreating,
  };
}
