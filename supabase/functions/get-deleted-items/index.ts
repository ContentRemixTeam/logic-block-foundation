import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getUserIdFromJWT(authHeader: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.substring(7);
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    return payload.sub;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const userId = getUserIdFromJWT(authHeader || '');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch deleted items from all tables in parallel
    const [tasksRes, sopsRes, ideasRes, habitsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('task_id, task_text, deleted_at')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100),
      supabase
        .from('sops')
        .select('sop_id, sop_name, deleted_at')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100),
      supabase
        .from('ideas')
        .select('id, content, deleted_at')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100),
      supabase
        .from('habits')
        .select('habit_id, habit_name, deleted_at')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100),
    ]);

    // Calculate days until permanent deletion (30 days from deleted_at)
    const calculateDaysRemaining = (deletedAt: string): number => {
      const deletedDate = new Date(deletedAt);
      const permanentDeleteDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysRemaining = Math.ceil((permanentDeleteDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return Math.max(0, daysRemaining);
    };

    const deletedItems = {
      tasks: (tasksRes.data || []).map((item) => ({
        id: item.task_id,
        name: item.task_text,
        type: 'task',
        deleted_at: item.deleted_at,
        days_until_permanent: calculateDaysRemaining(item.deleted_at),
      })),
      sops: (sopsRes.data || []).map((item) => ({
        id: item.sop_id,
        name: item.sop_name,
        type: 'sop',
        deleted_at: item.deleted_at,
        days_until_permanent: calculateDaysRemaining(item.deleted_at),
      })),
      ideas: (ideasRes.data || []).map((item) => ({
        id: item.id,
        name: item.content?.substring(0, 100) + (item.content?.length > 100 ? '...' : ''),
        type: 'idea',
        deleted_at: item.deleted_at,
        days_until_permanent: calculateDaysRemaining(item.deleted_at),
      })),
      habits: (habitsRes.data || []).map((item) => ({
        id: item.habit_id,
        name: item.habit_name,
        type: 'habit',
        deleted_at: item.deleted_at,
        days_until_permanent: calculateDaysRemaining(item.deleted_at),
      })),
    };

    const totalCount = 
      deletedItems.tasks.length + 
      deletedItems.sops.length + 
      deletedItems.ideas.length + 
      deletedItems.habits.length;

    console.log(`[get-deleted-items] Found ${totalCount} deleted items for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: deletedItems,
        total_count: totalCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-deleted-items] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
