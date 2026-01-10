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
  console.log('EDGE FUNC: get-user-settings called');

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get or create user settings
    let { data: settings, error } = await supabaseClient
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-create if missing - use upsert to handle race conditions
    if (!settings) {
      const { data: newSettings, error: upsertError } = await supabaseClient
        .from('user_settings')
        .upsert({
          user_id: userId,
          daily_review_questions: [],
          weekly_review_questions: [],
          monthly_review_questions: [],
          cycle_summary_questions: [],
          theme_preference: 'vibrant',
          xp_points: 0,
          user_level: 1,
          streak_potions_remaining: 2,
          current_debrief_streak: 0,
          longest_debrief_streak: 0,
        }, { onConflict: 'user_id', ignoreDuplicates: true })
        .select()
        .single();

      if (upsertError) {
        // If upsert failed, try to fetch existing record (race condition)
        const { data: existingSettings } = await supabaseClient
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (existingSettings) {
          settings = existingSettings;
        } else {
          console.error('Error creating settings:', upsertError);
          return new Response(JSON.stringify({ error: 'Failed to create settings' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        settings = newSettings;
      }
    }

    const parseJSON = (value: any, fallback: any) => {
      if (!value) return fallback;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return fallback;
        }
      }
      return value;
    };

    return new Response(
      JSON.stringify({
        daily_review_questions: parseJSON(settings.daily_review_questions, []),
        weekly_review_questions: parseJSON(settings.weekly_review_questions, []),
        monthly_review_questions: parseJSON(settings.monthly_review_questions, []),
        cycle_summary_questions: parseJSON(settings.cycle_summary_questions, []),
        minimal_mode: settings.minimal_mode ?? false,
        quick_mode_default: settings.quick_mode_default ?? true,
        habit_categories_enabled: settings.habit_categories_enabled ?? true,
        theme_preference: settings.theme_preference ?? 'quest',
        scratch_pad_review_mode: settings.scratch_pad_review_mode ?? 'quick_save',
        works_weekends: settings.works_weekends ?? false,
        // Quest Mode fields
        xp_points: settings.xp_points ?? 0,
        user_level: settings.user_level ?? 1,
        current_debrief_streak: settings.current_debrief_streak ?? 0,
        longest_debrief_streak: settings.longest_debrief_streak ?? 0,
        streak_potions_remaining: settings.streak_potions_remaining ?? 2,
        last_debrief_date: settings.last_debrief_date ?? null,
        potions_last_reset: settings.potions_last_reset ?? null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in get-user-settings:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
