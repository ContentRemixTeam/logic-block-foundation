import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('EDGE FUNC: manage-mastermind-rsvp called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client for auth validation
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Validate JWT by passing the token directly to getUser
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error('JWT validation error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const body = await req.json();
    const { action, event_id, event_summary, event_start, event_end, date_range } = body;

    console.log('Action:', action, 'User:', userId);

    // Use service role client for database operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
      case 'add': {
        if (!event_id || !event_summary || !event_start || !event_end) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabaseClient
          .from('user_mastermind_rsvps')
          .upsert({
            user_id: userId,
            event_id,
            event_summary,
            event_start,
            event_end,
          }, { onConflict: 'user_id,event_id' })
          .select()
          .single();

        if (error) {
          console.error('Error adding RSVP:', error);
          return new Response(JSON.stringify({ error: 'Failed to add RSVP' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('RSVP added:', data.id);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'remove': {
        if (!event_id) {
          return new Response(JSON.stringify({ error: 'Missing event_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseClient
          .from('user_mastermind_rsvps')
          .delete()
          .eq('user_id', userId)
          .eq('event_id', event_id);

        if (error) {
          console.error('Error removing RSVP:', error);
          return new Response(JSON.stringify({ error: 'Failed to remove RSVP' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('RSVP removed for event:', event_id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list': {
        let query = supabaseClient
          .from('user_mastermind_rsvps')
          .select('*')
          .eq('user_id', userId)
          .gte('event_end', new Date().toISOString())
          .order('event_start', { ascending: true });

        // Optional date range filter
        if (date_range?.start) {
          query = query.gte('event_start', date_range.start);
        }
        if (date_range?.end) {
          query = query.lte('event_start', date_range.end);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error listing RSVPs:', error);
          return new Response(JSON.stringify({ error: 'Failed to list RSVPs' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Found', data.length, 'RSVPs');
        return new Response(JSON.stringify({ rsvps: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in manage-mastermind-rsvp:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
