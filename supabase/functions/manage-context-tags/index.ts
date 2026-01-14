import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TagPayload {
  action: 'list' | 'create' | 'update' | 'delete' | 'seed-defaults';
  id?: string;
  value?: string;
  label?: string;
  icon?: string;
  sort_order?: number;
}

const DEFAULT_TAGS = [
  { value: 'deep-work', label: 'Deep Work', icon: '🎯', sort_order: 0 },
  { value: 'admin', label: 'Admin', icon: '📋', sort_order: 1 },
  { value: 'creative', label: 'Creative', icon: '🎨', sort_order: 2 },
  { value: 'calls', label: 'Calls', icon: '📞', sort_order: 3 },
  { value: 'email', label: 'Email', icon: '📧', sort_order: 4 },
  { value: 'research', label: 'Research', icon: '🔍', sort_order: 5 },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    );

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: TagPayload = await req.json();
    const { action } = payload;

    console.log(`[manage-context-tags] User ${user.id} action: ${action}`);

    switch (action) {
      case 'list': {
        const { data: tags, error } = await supabase
          .from('user_context_tags')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching tags:', error);
          throw error;
        }

        console.log(`[manage-context-tags] Found ${tags?.length || 0} tags`);
        return new Response(
          JSON.stringify({ tags: tags || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!payload.value || !payload.label) {
          return new Response(
            JSON.stringify({ error: 'Value and label are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get next sort order
        const { data: existing } = await supabase
          .from('user_context_tags')
          .select('sort_order')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: false })
          .limit(1);

        const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

        const { data: newTag, error } = await supabase
          .from('user_context_tags')
          .insert({
            user_id: user.id,
            value: payload.value.toLowerCase().replace(/\s+/g, '-'),
            label: payload.label,
            icon: payload.icon || '🏷️',
            sort_order: nextOrder,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating tag:', error);
          if (error.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'A tag with this name already exists' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw error;
        }

        console.log(`[manage-context-tags] Created tag: ${newTag.label}`);
        return new Response(
          JSON.stringify({ tag: newTag }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!payload.id) {
          return new Response(
            JSON.stringify({ error: 'Tag ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updates: Record<string, unknown> = {};
        if (payload.label) updates.label = payload.label;
        if (payload.icon) updates.icon = payload.icon;
        if (payload.sort_order !== undefined) updates.sort_order = payload.sort_order;

        const { data: updatedTag, error } = await supabase
          .from('user_context_tags')
          .update(updates)
          .eq('id', payload.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating tag:', error);
          throw error;
        }

        console.log(`[manage-context-tags] Updated tag: ${updatedTag?.label}`);
        return new Response(
          JSON.stringify({ tag: updatedTag }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!payload.id) {
          return new Response(
            JSON.stringify({ error: 'Tag ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('user_context_tags')
          .delete()
          .eq('id', payload.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting tag:', error);
          throw error;
        }

        console.log(`[manage-context-tags] Deleted tag: ${payload.id}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'seed-defaults': {
        // Check if user already has tags
        const { data: existingTags } = await supabase
          .from('user_context_tags')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (existingTags && existingTags.length > 0) {
          console.log(`[manage-context-tags] User already has tags, skipping seed`);
          return new Response(
            JSON.stringify({ message: 'Tags already exist', seeded: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert default tags
        const tagsToInsert = DEFAULT_TAGS.map(tag => ({
          ...tag,
          user_id: user.id,
        }));

        const { error } = await supabase
          .from('user_context_tags')
          .insert(tagsToInsert);

        if (error) {
          console.error('Error seeding default tags:', error);
          throw error;
        }

        console.log(`[manage-context-tags] Seeded ${DEFAULT_TAGS.length} default tags`);
        return new Response(
          JSON.stringify({ message: 'Default tags created', seeded: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[manage-context-tags] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
