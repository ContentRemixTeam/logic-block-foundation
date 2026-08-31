// deno-lint-ignore no-import-prefix
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createVaultPlaylistsHandler } from './vaultPlaylists.ts';

function request(body: unknown) {
  return new Request('https://example.test/vault-playlists', {
    method: 'POST', headers: { authorization: 'Bearer token', origin: 'https://plan.faithmariah.com' },
    body: JSON.stringify(body),
  });
}

Deno.test('playlist endpoint binds RPC identity to authenticated user', async () => {
  let called: { name: string; args: Record<string, unknown> } | null = null;
  const handler = createVaultPlaylistsHandler({
    isAllowedOrigin: () => true,
    authenticate: () => Promise.resolve({ id: 'trusted-user', email: 'annual@example.com' }),
    rpc: (name, args) => { called = { name, args }; return Promise.resolve({ data: [] }); },
    log: () => {},
  });
  const response = await handler(request({ action: 'items', slug: 'focus-on-next' }));
  assertEquals(response.status, 200);
  assertEquals(called, {
    name: 'replay_vault_playlist_items_authorized',
    args: { p_user_id: 'trusted-user', p_email: 'annual@example.com', p_playlist_slug: 'focus-on-next', p_preview: true },
  });
});

Deno.test('playlist endpoint rejects caller-supplied identity and malformed slug', async () => {
  let rpcCalls = 0;
  const handler = createVaultPlaylistsHandler({
    isAllowedOrigin: () => true,
    authenticate: () => Promise.resolve({ id: 'trusted-user', email: 'annual@example.com' }),
    rpc: () => { rpcCalls++; return Promise.resolve({ data: [] }); },
    log: () => {},
  });
  assertEquals((await handler(request({ action: 'list', userId: 'other-user' }))).status, 400);
  assertEquals((await handler(request({ action: 'items', slug: '../private' }))).status, 400);
  assertEquals(rpcCalls, 0);
});

Deno.test('playlist response maps member-safe fields only', async () => {
  const handler = createVaultPlaylistsHandler({
    isAllowedOrigin: () => true,
    authenticate: () => Promise.resolve({ id: 'trusted-user', email: 'annual@example.com' }),
    rpc: () => Promise.resolve({ data: [{ playlist_id: 'p1', slug: 'focus-on-next', title: 'Focus', description: 'Choose one move', playlist_kind: 'curated', primary_stage: 'Foundation', is_featured: true, item_count: 4, source_playlist_id: 'private' }] }),
    log: () => {},
  });
  const response = await handler(request({ action: 'list' }));
  const text = await response.text();
  assertEquals(response.status, 200);
  assert(!text.includes('source_playlist_id'));
  assert(!text.includes('private'));
  assertEquals(JSON.parse(text).playlists[0].itemCount, 4);
});
