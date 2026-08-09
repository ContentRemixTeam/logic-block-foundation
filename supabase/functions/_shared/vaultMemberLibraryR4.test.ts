import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createMemberLibraryHandler, LIBRARY_ERROR, mapLibraryRequest } from './vaultMemberLibraryR4.ts';

const origin = 'https://app.faithmariah.com';
Deno.env.set('REPLAY_VAULT_ALLOWED_ORIGINS', origin);
const request = (body: unknown, headers: Record<string, string> = {}) => new Request('https://edge.test', {
  method: 'POST',
  headers: { origin, authorization: 'Bearer token', 'content-type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

function fixture(options: { authenticated?: boolean; rpcError?: boolean } = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const logs: string[] = [];
  const handler = createMemberLibraryHandler({
    isAllowedOrigin: (req) => req.headers.get('origin') === origin,
    authenticate: async () => options.authenticated === false ? null : { id: '11111111-1111-4111-8111-111111111111' },
    rpc: async (name, args) => {
      calls.push({ name, args });
      return options.rpcError ? { data: null, error: { code: '42501' } } : { data: [] };
    },
    log: (_requestId, taxonomy) => logs.push(taxonomy),
  });
  return { handler, calls, logs };
}

Deno.test('library mapper chooses fixed RPCs and clamps pagination', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const mapped = mapLibraryRequest({ action: 'transcript', resourceId: 'replay-1', afterIndex: 999_999, limit: 999 }, userId);
  assertEquals(mapped?.rpc, 'replay_vault_transcript_member');
  assertEquals(mapped?.args, { p_user_id: userId, p_limit: 101, p_portal_resource_id: 'replay-1', p_after_index: 999_999 });
  assertEquals(mapLibraryRequest({ action: 'saved', filter: 'private' }, userId), null);
  assertEquals(mapLibraryRequest({ action: 'transcript', resourceId: '../private' }, userId), null);
});

Deno.test('caller identity, scope and time authority are rejected before RPC', async () => {
  for (const forged of [{ userId: 'other' }, { user_id: 'other' }, { scopes: ['vault'] }, { accessScopes: ['vault'] }, { timestamp: '2020-01-01' }, { asOf: '2020-01-01' }, { providerLocator: 'secret' }, { sourceLocator: 'secret' }, { dropboxPath: '/secret' }, { dropboxFileId: 'secret' }, { playbackUrl: 'https://secret' }, { nested: { permanentUrl: 'https://secret' } }]) {
    const current = fixture();
    const response = await current.handler(request({ action: 'browse', ...forged }));
    assertEquals(response.status, 400);
    assertEquals(current.calls.length, 0);
    assertEquals(await response.json(), LIBRARY_ERROR);
  }
});

Deno.test('origin, authentication, malformed and oversized bodies fail closed', async () => {
  let current = fixture();
  let response = await current.handler(new Request('https://edge.test', { method: 'POST', headers: { origin: 'https://evil.test' }, body: '{}' }));
  assertEquals(response.status, 404);
  current = fixture({ authenticated: false });
  response = await current.handler(request({ action: 'browse' }));
  assertEquals(response.status, 401);
  current = fixture();
  response = await current.handler(request('{PRIVATE_SENTINEL'));
  assertEquals(response.status, 400);
  assert(!JSON.stringify(current.logs).includes('PRIVATE_SENTINEL'));
  response = await current.handler(request({ action: 'browse', padding: 'x'.repeat(17_000) }));
  assertEquals(response.status, 413);
});

Deno.test('authorized requests use authenticated user only and RPC failures stay generic', async () => {
  let current = fixture();
  let response = await current.handler(request({ action: 'questions', resourceId: 'replay-1', limit: 60 }));
  assertEquals(response.status, 200);
  assertEquals(current.calls[0].name, 'replay_vault_questions_member');
  assertEquals(current.calls[0].args.p_user_id, '11111111-1111-4111-8111-111111111111');
  current = fixture({ rpcError: true });
  response = await current.handler(request({ action: 'categories' }));
  assertEquals(response.status, 503);
  assertEquals(await response.json(), LIBRARY_ERROR);
  assertEquals(current.logs, ['rpc_rejected']);
});

Deno.test('limit plus one emits an explicit stable cursor and strips row cursor', async()=>{const calls:any[]=[];const handler=createMemberLibraryHandler({isAllowedOrigin:()=>true,authenticate:async()=>({id:'11111111-1111-4111-8111-111111111111'}),rpc:async(name,args)=>{calls.push({name,args});return {data:[{portal_resource_id:'a',title:'A',category:'C',duration_seconds:1,question_count:0,row_cursor:'{\"publishedAt\":\"2026-08-09T00:00:00Z\",\"id\":\"11111111-1111-4111-8111-111111111111\"}'},{portal_resource_id:'b',title:'B',category:'C',duration_seconds:1,question_count:0,row_cursor:'{\"publishedAt\":\"2026-08-08T00:00:00Z\",\"id\":\"22222222-2222-4222-8222-222222222222\"}'}]};},log:()=>{}});const response=await handler(request({action:'browse',limit:1}));const body=await response.json();assertEquals(response.status,200);assertEquals(body.items.length,1);assert(typeof body.nextCursor==='string');assertEquals(calls[0].args.p_limit,2);assert(!JSON.stringify(body).includes('row_cursor'));assert(mapLibraryRequest({action:'browse',cursor:body.nextCursor,limit:1},'11111111-1111-4111-8111-111111111111'));});
