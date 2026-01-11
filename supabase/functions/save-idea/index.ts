import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== ZOD SCHEMA ====================

const IdeaSaveSchema = z.object({
  id: z.string().uuid('Invalid idea ID').optional(),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be under 10000 characters'),
  category_id: z.string().uuid('Invalid category ID').nullable().optional(),
  priority: z.enum(['asap', 'next_week', 'next_month', 'someday']).nullable().optional(),
  tags: z.array(z.string().max(50, 'Tag must be under 50 characters')).optional(),
  project_id: z.string().uuid('Invalid project ID').nullable().optional(),
});

// ==================== VALIDATION ERROR HELPER ====================

function validationErrorResponse(error: z.ZodError) {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const body = await req.json();

    // ==================== ZOD VALIDATION ====================
    const parseResult = IdeaSaveSchema.safeParse(body);
    if (!parseResult.success) {
      console.log('[save-idea] Validation failed:', parseResult.error.errors);
      return validationErrorResponse(parseResult.error);
    }

    const validatedData = parseResult.data;
    const { id, content, category_id, priority, tags, project_id } = validatedData;

    const trimmedContent = content.trim();

    // Normalize tags
    const normalizedTags = Array.isArray(tags) 
      ? tags.filter((t) => t.trim()).map(t => t.substring(0, 50)) 
      : [];

    console.log('[save-idea] Saving idea for user:', user.id, { 
      id, 
      contentLength: trimmedContent.length, 
      category_id, 
      priority, 
      tags: normalizedTags, 
      project_id 
    });

    if (id) {
      // Update existing idea
      const { data, error } = await supabase
        .from('ideas')
        .update({
          content: trimmedContent,
          category_id: category_id || null,
          priority: priority || null,
          tags: normalizedTags,
          project_id: project_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[save-idea] Error updating idea:', error);
        throw error;
      }

      console.log('[save-idea] Successfully updated idea:', id);
      return new Response(
        JSON.stringify({ idea: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Insert new idea
      const { data, error } = await supabase
        .from('ideas')
        .insert({
          user_id: user.id,
          content: trimmedContent,
          category_id: category_id || null,
          priority: priority || null,
          tags: normalizedTags,
          project_id: project_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[save-idea] Error inserting idea:', error);
        throw error;
      }

      console.log('[save-idea] Successfully created idea:', data.id);
      return new Response(
        JSON.stringify({ idea: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('[save-idea] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
