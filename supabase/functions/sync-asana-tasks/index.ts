// Faith-only Asana → tasks sync. V1: manual sync, no per-user tokens stored.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_EMAIL = 'faithhawks@gmail.com';
const EXTERNAL_SOURCE = 'asana';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const email = (claimsData.claims.email as string | undefined)?.toLowerCase();
    const userId = claimsData.claims.sub as string;

    if (email !== ALLOWED_EMAIL) {
      return json({ error: 'Forbidden — Asana sync is not available for this account.' }, 403);
    }

    const ASANA_PAT = Deno.env.get('ASANA_PAT');
    if (!ASANA_PAT) return json({ error: 'ASANA_PAT is not configured' }, 500);

    // 1. Get the Asana user's workspace
    const meRes = await fetch('https://app.asana.com/api/1.0/users/me?opt_fields=workspaces.name,workspaces.gid', {
      headers: { Authorization: `Bearer ${ASANA_PAT}` },
    });
    if (!meRes.ok) {
      const txt = await meRes.text();
      return json({ error: `Asana /users/me failed [${meRes.status}]: ${txt}` }, 502);
    }
    const meData = await meRes.json();
    const workspaces: Array<{ gid: string; name: string }> = meData?.data?.workspaces ?? [];
    if (workspaces.length === 0) return json({ error: 'No Asana workspaces found' }, 502);

    // 2. Pull incomplete tasks assigned to "me" across all workspaces
    const collected: Array<Record<string, unknown>> = [];
    for (const ws of workspaces) {
      const url = new URL('https://app.asana.com/api/1.0/tasks');
      url.searchParams.set('assignee', 'me');
      url.searchParams.set('workspace', ws.gid);
      url.searchParams.set('completed_since', 'now');
      url.searchParams.set('opt_fields', 'gid,name,notes,permalink_url,due_on,due_at,completed,modified_at,projects.name');
      url.searchParams.set('limit', '100');

      const tRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${ASANA_PAT}` },
      });
      if (!tRes.ok) {
        const txt = await tRes.text();
        return json({ error: `Asana /tasks failed [${tRes.status}]: ${txt}`, workspace: ws.name }, 502);
      }
      const tData = await tRes.json();
      for (const t of (tData?.data ?? [])) collected.push(t);
    }

    // 3. Upsert into public.tasks keyed by (user_id, external_source, external_id)
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const t of collected) {
      const externalId = String((t as any).gid);
      const name = String((t as any).name ?? '').trim();
      if (!name) { skipped++; continue; }

      const notes = (t as any).notes ?? null;
      const permalink = (t as any).permalink_url ?? null;
      const dueOn = (t as any).due_on ?? null;
      const modifiedAt = (t as any).modified_at ?? null;
      const projects = ((t as any).projects ?? []) as Array<{ name?: string }>;
      const projectTags = projects.map((p) => p?.name).filter(Boolean);

      // Look for existing
      const { data: existing } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('user_id', userId)
        .eq('external_source', EXTERNAL_SOURCE)
        .eq('external_id', externalId)
        .maybeSingle();

      const payload = {
        user_id: userId,
        task_text: name,
        task_description: notes,
        external_source: EXTERNAL_SOURCE,
        external_id: externalId,
        external_url: permalink,
        external_updated_at: modifiedAt,
        external_raw: t,
        due_date: dueOn,
        source: 'asana',
        status: 'backlog',
        tags: projectTags,
      };

      if (existing?.task_id) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('task_id', existing.task_id);
        if (error) console.error('update error', error);
        else updated++;
      } else {
        const { error } = await supabase.from('tasks').insert(payload);
        if (error) console.error('insert error', error);
        else inserted++;
      }
    }

    return json({
      ok: true,
      total: collected.length,
      inserted,
      updated,
      skipped,
      workspaces: workspaces.map((w) => w.name),
    }, 200);
  } catch (err) {
    console.error('sync-asana-tasks error', err);
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
