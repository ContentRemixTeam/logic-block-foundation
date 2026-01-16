import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== ZOD SCHEMA ====================

const JournalPageSchema = z.object({
  id: z.string().uuid('Invalid page ID').optional(),
  title: z.string().max(200, 'Title must be under 200 characters').optional().default('Untitled Page'),
  content: z.string().max(50000, 'Content must be under 50000 characters').optional().default(''),
  tags: z.array(z.string().max(50, 'Tag must be under 50 characters')).optional(),
  is_archived: z.boolean().optional().default(false),
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

// ==================== AUTH HELPERS ====================

async function getAuthenticatedUserId(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await authClient.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('[save-journal-page] JWT validation failed:', error);
    return { userId: null, error: 'Invalid or expired token' };
  }

  return { userId: data.claims.sub as string, error: null };
}

// ==================== UTILITY FUNCTIONS ====================

// Extract hashtags from content
function extractHashtags(content: string): string[] {
  if (!content) return [];
  const regex = /#[\w-]+/g;
  const matches = content.match(regex) || [];
  // Return unique hashtags, lowercased
  return [...new Set(matches.map(tag => tag.toLowerCase()))];
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    
    if (authError || !userId) {
      return new Response(JSON.stringify({ error: authError || 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    // ==================== ZOD VALIDATION ====================
    const parseResult = JournalPageSchema.safeParse(body);
    if (!parseResult.success) {
      console.log('[save-journal-page] Validation failed:', parseResult.error.errors);
      return validationErrorResponse(parseResult.error);
    }

    const validatedData = parseResult.data;
    const { id, title, content, tags, is_archived, project_id } = validatedData;

    // Auto-extract hashtags from content and merge with provided tags
    const extractedTags = extractHashtags(content || '');
    const providedTags = Array.isArray(tags) ? tags.map(t => t.substring(0, 50)) : [];
    const allTags = [...new Set([...providedTags, ...extractedTags])];

    if (id) {
      // Update existing page
      const { data, error } = await supabase
        .from('journal_pages')
        .update({
          title: title || 'Untitled Page',
          content: content || '',
          tags: allTags,
          is_archived: is_archived || false,
          project_id: project_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
          *,
          project:projects(id, name, color)
        `)
        .single();

      if (error) {
        console.error('Error updating journal page:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ page: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Create new page
      const { data, error } = await supabase
        .from('journal_pages')
        .insert({
          user_id: userId,
          title: title || 'Untitled Page',
          content: content || '',
          tags: allTags,
          project_id: project_id || null,
        })
        .select(`
          *,
          project:projects(id, name, color)
        `)
        .single();

      if (error) {
        console.error('Error creating journal page:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ page: data }), {
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
