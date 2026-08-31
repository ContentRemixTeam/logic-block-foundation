import { bearerHeader, readBoundedJson, responseHeaders, secureJson } from './replayVaultAccess.ts';
import { memberSafeText } from './replayVaultProducer.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ERROR = { error: 'Replay Vault request unavailable' } as const;
type User = { id: string; email?: string };
type Dependencies = {
  isAllowedOrigin(req: Request): boolean;
  authenticate(bearer: string): Promise<User | null>;
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error?: unknown }>;
  log(taxonomy: 'auth_rejected' | 'request_rejected' | 'rpc_rejected' | 'internal_error'): void;
};

export function createVaultPlaylistsHandler(deps: Dependencies) {
  return async (req: Request) => {
    if (!deps.isAllowedOrigin(req)) return secureJson(req, ERROR, 404);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(req) });
    if (req.method !== 'POST') return secureJson(req, ERROR, 405);
    try {
      const bearer = bearerHeader(req);
      if (!bearer) { deps.log('auth_rejected'); return secureJson(req, ERROR, 401); }
      const user = await deps.authenticate(bearer);
      if (!user?.email) { deps.log('auth_rejected'); return secureJson(req, ERROR, 401); }
      const body = await readBoundedJson<Record<string, unknown>>(req);
      const action = body?.action;
      const allowed = action === 'list' ? ['action'] : ['action', 'slug'];
      if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).some((key) => !allowed.includes(key))) {
        deps.log('request_rejected'); return secureJson(req, ERROR, 400);
      }
      const slug = typeof body.slug === 'string' ? body.slug : '';
      if (!['list', 'items'].includes(String(action)) || (action === 'items' && !SLUG.test(slug))) {
        deps.log('request_rejected'); return secureJson(req, ERROR, 400);
      }
      const result = await deps.rpc(
        action === 'list' ? 'replay_vault_playlists_authorized' : 'replay_vault_playlist_items_authorized',
        {
          p_user_id: user.id,
          p_email: user.email,
          ...(action === 'items' ? { p_playlist_slug: slug } : {}),
          p_preview: true,
        },
      );
      if (result.error) { deps.log('rpc_rejected'); return secureJson(req, ERROR, 503); }
      const rows = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
      if (action === 'list') return secureJson(req, { playlists: rows.map((row) => ({
        id: String(row.playlist_id ?? ''), slug: String(row.slug ?? ''),
        title: memberSafeText(row.title, 120), description: memberSafeText(row.description, 320),
        kind: String(row.playlist_kind ?? ''), primaryStage: row.primary_stage ? memberSafeText(row.primary_stage, 40) : null,
        featured: Boolean(row.is_featured), itemCount: Number(row.item_count ?? 0),
      })) });
      return secureJson(req, { items: rows.map((row) => ({
        playlistId: String(row.playlist_id ?? ''), playlistSlug: String(row.playlist_slug ?? ''),
        playlistTitle: memberSafeText(row.playlist_title, 120), resourceId: String(row.resource_id ?? ''),
        title: memberSafeText(row.resource_title, 160, 'Replay'), product: memberSafeText(row.product_title, 160),
        category: memberSafeText(row.category_title, 120, 'Replay'), position: Number(row.item_position),
        startMs: row.start_ms == null ? null : Number(row.start_ms), endMs: row.end_ms == null ? null : Number(row.end_ms),
        why: memberSafeText(row.why_this_resource, 320), speaker: row.speaker_attribution ? memberSafeText(row.speaker_attribution, 120) : null,
      })) });
    } catch (error) {
      deps.log(error instanceof Error && ['request_too_large', 'invalid_json'].includes(error.message)
        ? 'request_rejected' : 'internal_error');
      return secureJson(req, ERROR, error instanceof Error && error.message === 'request_too_large' ? 413 : 400);
    }
  };
}

