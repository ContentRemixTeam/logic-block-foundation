import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
  console.log('EDGE FUNC: save-habit called');

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
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { habit_id, habit_name, category, type, description, success_definition } = body;

    // Input validation
    if (!habit_name || typeof habit_name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Habit name is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const trimmedName = habit_name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Habit name must be 1-200 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate type if provided
    const validTypes = ['daily', 'weekly', null, undefined];
    if (type !== undefined && !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid habit type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate category length if provided
    if (category && typeof category === 'string' && category.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Category must be less than 100 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (habit_id) {
      // Update existing habit
      const { error } = await supabaseClient
        .from('habits')
        .update({
          habit_name: trimmedName,
          category: category?.trim()?.substring(0, 100) || null,
          type: type || 'daily',
          description: description?.substring(0, 1000) || null,
          success_definition: success_definition?.substring(0, 500) || null,
          updated_at: new Date().toISOString(),
        })
        .eq('habit_id', habit_id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating habit:', error);
        return new Response(JSON.stringify({ error: 'Failed to update habit' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Create new habit
      const { error } = await supabaseClient
        .from('habits')
        .insert({
          user_id: userId,
          habit_name: trimmedName,
          category: category?.trim()?.substring(0, 100) || null,
          type: type || 'daily',
          description: description?.substring(0, 1000) || null,
          success_definition: success_definition?.substring(0, 500) || null,
        });

      if (error) {
        console.error('Error creating habit:', error);
        return new Response(JSON.stringify({ error: 'Failed to create habit' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in save-habit:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
