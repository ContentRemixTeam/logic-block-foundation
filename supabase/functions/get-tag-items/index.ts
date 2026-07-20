import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (error || !data?.claims) return { userId: null, error: 'Invalid or expired token' };
  return { userId: data.claims.sub as string, error: null };
}

const norm = (t: string) => t.trim().toLowerCase().replace(/^#/, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    if (authError || !userId) {
      return new Response(JSON.stringify({ error: authError || 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    let tag = url.searchParams.get('tag') || '';
    if (!tag) {
      try {
        const body = await req.json();
        tag = body?.tag || '';
      } catch { /* no body */ }
    }
    const tagKey = norm(tag);
    if (!tagKey) {
      return new Response(JSON.stringify({ error: 'Missing tag' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const hashPattern = `%#${tagKey}%`;

    // Journal pages (tags jsonb array, stored as strings like "#idea")
    const pagesRes = await supabase
      .from('journal_pages')
      .select('id, title, content, tags, updated_at, project_id, course_id, course_title')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(500);

    const pages = (pagesRes.data || []).filter((p: any) => {
      const arr = Array.isArray(p.tags) ? p.tags : [];
      return arr.some((t: any) => typeof t === 'string' && norm(t) === tagKey);
    });

    // Daily entries — scratch pad contains #tag
    const entriesRes = await supabase
      .from('daily_plans')
      .select('day_id, date, scratch_pad_title, scratch_pad_content, updated_at')
      .eq('user_id', userId)
      .not('scratch_pad_content', 'is', null)
      .ilike('scratch_pad_content', hashPattern)
      .order('date', { ascending: false })
      .limit(200);
    const entries = entriesRes.data || [];

    // Tasks — tags jsonb array
    const tasksRes = await supabase
      .from('tasks')
      .select('id, title, status, due_date, updated_at, tags')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(500);
    const tasks = (tasksRes.data || []).filter((t: any) => {
      const arr = Array.isArray(t.tags) ? t.tags : [];
      return arr.some((v: any) => typeof v === 'string' && norm(v) === tagKey);
    });

    // Ideas — tags text[] array
    const ideasRes = await supabase
      .from('ideas')
      .select('id, title, content, tags, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(500);
    const ideas = (ideasRes.data || []).filter((i: any) => {
      const arr = Array.isArray(i.tags) ? i.tags : [];
      return arr.some((v: any) => typeof v === 'string' && norm(v) === tagKey);
    });

    const totalCount = pages.length + entries.length + tasks.length + ideas.length;

    return new Response(JSON.stringify({
      tag: tagKey,
      totalCount,
      pages,
      entries,
      tasks,
      ideas,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[get-tag-items] error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
