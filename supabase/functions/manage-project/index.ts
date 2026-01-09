import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserIdFromJWT(authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action, project } = body;

    switch (action) {
      case 'create': {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: project.name,
            description: project.description || null,
            status: project.status || 'active',
            color: project.color || '#6366f1',
            start_date: project.start_date || null,
            end_date: project.end_date || null,
            is_template: project.is_template || false,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating project:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
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
            updated_at: new Date().toISOString(),
          })
          .eq('id', project.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating project:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        // First, remove project_id from all tasks in this project
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
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
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
          return new Response(JSON.stringify({ error: 'Template not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ data: newProject }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
