import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// User-friendly error messages
const ERROR_MESSAGES = {
  NO_AUTH: { code: 'AUTH_REQUIRED', message: 'Please log in to continue.' },
  INVALID_TOKEN: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Please refresh the page.' },
  INVALID_ACTION: { code: 'INVALID_ACTION', message: 'Invalid operation requested.' },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Project not found or you don\'t have access to it.' },
  NAME_REQUIRED: { code: 'VALIDATION_ERROR', message: 'Project name is required.' },
  SERVER_ERROR: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' },
};

function errorResponse(error: typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES], status: number, technical?: string) {
  console.error(`[manage-project] ${error.code}: ${technical || error.message}`);
  return new Response(
    JSON.stringify({ error: error.message, code: error.code, technical }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.sub || null;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(ERROR_MESSAGES.NO_AUTH, 401);
    }

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      return errorResponse(ERROR_MESSAGES.INVALID_TOKEN, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, project } = body;

    switch (action) {
      case 'create': {
        if (!project?.name?.trim()) {
          return errorResponse(ERROR_MESSAGES.NAME_REQUIRED, 400);
        }
        
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: project.name.trim(),
            description: project.description || null,
            status: project.status || 'active',
            color: project.color || '#6366f1',
            start_date: project.start_date || null,
            end_date: project.end_date || null,
            is_template: project.is_template || false,
            cycle_id: project.cycle_id || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating project:', error);
          return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500, error.message);
        }

        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        if (!project?.id) {
          return errorResponse(ERROR_MESSAGES.NOT_FOUND, 400);
        }
        
        const { data, error } = await supabase
          .from('projects')
          .update({
            name: project.name,
            description: project.description,
            status: project.status,
            color: project.color,
            start_date: project.start_date,
            end_date: project.end_date,
            is_template: project.is_template,
            cycle_id: project.cycle_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', project.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating project:', error);
          if (error.code === 'PGRST116') {
            return errorResponse(ERROR_MESSAGES.NOT_FOUND, 404);
          }
          return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500, error.message);
        }

        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!project?.id) {
          return errorResponse(ERROR_MESSAGES.NOT_FOUND, 400);
        }
        
        // First check if project has tasks
        const { count: taskCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('user_id', userId);
        
        // Remove project_id from all tasks in this project
        await supabase
          .from('tasks')
          .update({ project_id: null, project_column: 'todo' })
          .eq('project_id', project.id)
          .eq('user_id', userId);

        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', project.id)
          .eq('user_id', userId);

        if (error) {
          console.error('Error deleting project:', error);
          return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500, error.message);
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: taskCount && taskCount > 0 
            ? `Project deleted. ${taskCount} task(s) were moved to your inbox.`
            : 'Project deleted.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'duplicate_template': {
        // Fetch the template project
        const { data: template, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', project.id)
          .eq('user_id', userId)
          .single();

        if (fetchError || !template) {
          return errorResponse(ERROR_MESSAGES.NOT_FOUND, 404);
        }

        // Create new project from template
        const { data: newProject, error: createError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: project.newName || `${template.name} (Copy)`,
            description: template.description,
            status: 'active',
            color: template.color,
            start_date: project.start_date || null,
            end_date: project.end_date || null,
            is_template: false,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating from template:', createError);
          return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500, createError.message);
        }

        return new Response(JSON.stringify({ data: newProject }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return errorResponse(ERROR_MESSAGES.INVALID_ACTION, 400);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse(ERROR_MESSAGES.SERVER_ERROR, 500, String(error));
  }
});
