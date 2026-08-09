import { bearerHeader, readBoundedJson, responseHeaders, secureJson } from './replayVaultAccess.ts';
import { memberSafeText } from './replayVaultProducer.mjs';

const RESOURCE = /^(?:[A-Za-z0-9][A-Za-z0-9_-]{0,127}|membershipio:[0-9a-f]{64})$/;
const ACTIONS = new Set(['browse', 'categories', 'transcript', 'questions', 'saved']);
const FORBIDDEN_FIELDS = ['userId', 'user_id', 'scopes', 'accessScopes', 'timestamp', 'asOf', 'as_of'];
export const LIBRARY_ERROR = { error: 'Replay Vault request unavailable' } as const;

type Body = { action?: unknown; resourceId?: unknown; category?: unknown; filter?: unknown; offset?: unknown; limit?: unknown; afterIndex?: unknown };
export type LibraryUser = { id: string };
export type LibraryDependencies = {
  isAllowedOrigin(req: Request): boolean;
  authenticate(bearer: string): Promise<LibraryUser | null>;
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error?: unknown }>;
  log(requestId: string, taxonomy: 'auth_rejected' | 'request_rejected' | 'rpc_rejected' | 'internal_error'): void;
};

type MappedRequest = { rpc: string; args: Record<string, unknown>; action: string };
const integer = (value: unknown, fallback: number, maximum: number) => Number.isSafeInteger(value) && Number(value) >= 0 ? Math.min(Number(value), maximum) : fallback;
const text = (value: unknown, maximum: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum ? value.trim() : null;

export function mapLibraryRequest(body: unknown, userId: string): MappedRequest | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (FORBIDDEN_FIELDS.some((field) => field in record)) return null;
  const action = text(record.action, 24);
  if (!action || !ACTIONS.has(action)) return null;
  const base = { p_user_id: userId };
  if (action === 'browse') return { action, rpc: 'replay_vault_browse_member', args: { ...base, p_category: text(record.category, 120), p_offset: integer(record.offset, 0, 2000), p_limit: integer(record.limit, 20, 40) } };
  if (action === 'categories') return { action, rpc: 'replay_vault_categories_member', args: base };
  if (action === 'transcript') {
    const resourceId = text(record.resourceId, 220);
    if (!resourceId || !RESOURCE.test(resourceId)) return null;
    const afterIndex = typeof record.afterIndex === 'number' && Number.isSafeInteger(record.afterIndex) ? Math.max(-1, Math.min(record.afterIndex, 100_000)) : -1;
    return { action, rpc: 'replay_vault_transcript_member', args: { ...base, p_portal_resource_id: resourceId, p_after_index: afterIndex, p_limit: integer(record.limit, 80, 100) } };
  }
  if (action === 'questions') {
    const resourceId = text(record.resourceId, 220);
    if (resourceId && !RESOURCE.test(resourceId)) return null;
    return { action, rpc: 'replay_vault_questions_member', args: { ...base, p_portal_resource_id: resourceId, p_offset: integer(record.offset, 0, 2000), p_limit: integer(record.limit, 40, 60) } };
  }
  const filter = text(record.filter, 16) ?? 'all';
  if (!['all', 'videos', 'moments'].includes(filter)) return null;
  return { action, rpc: 'replay_vault_saved_member', args: { ...base, p_filter: filter, p_offset: integer(record.offset, 0, 2000), p_limit: integer(record.limit, 40, 60) } };
}

function mapRows(action: string, rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    if (action === 'transcript') return { cueId: String(row.cue_id ?? ''), cueIndex: Number(row.cue_index), startSeconds: Number(row.start_seconds), endSeconds: Number(row.end_seconds), text: memberSafeText(row.cue_text, 1000) };
    if (action === 'questions') return { questionId: String(row.question_id ?? ''), resourceId: String(row.portal_resource_id ?? ''), title: memberSafeText(row.title, 160, 'Replay'), category: memberSafeText(row.category, 120, 'Replay'), question: memberSafeText(row.question, 400), answerSummary: memberSafeText(row.answer_summary, 600), answerer: memberSafeText(row.answerer, 120), startSeconds: Number(row.start_seconds), endSeconds: Number(row.end_seconds) };
    if (action === 'saved') return { bookmarkId: String(row.bookmark_id ?? ''), resourceId: String(row.portal_resource_id ?? ''), title: memberSafeText(row.title, 160, 'Replay'), category: memberSafeText(row.category, 120, 'Replay'), targetKind: String(row.target_kind ?? ''), targetId: String(row.target_id ?? ''), startSeconds: Number(row.cue_seconds), savedAt: String(row.saved_at ?? ''), label: memberSafeText(row.label, 400) };
    return { resourceId: String(row.portal_resource_id ?? ''), title: memberSafeText(row.title, 160, 'Replay'), category: memberSafeText(row.category, 120, 'Replay'), durationSeconds: Number(row.duration_seconds), publishedAt: typeof row.published_at === 'string' ? row.published_at : null, questionCount: Number(row.question_count ?? 0) };
  });
}

export function createMemberLibraryHandler(deps: LibraryDependencies) {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();
    if (!deps.isAllowedOrigin(req)) {
      deps.log(requestId, 'request_rejected');
      return secureJson(req, LIBRARY_ERROR, 404);
    }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(req) });
    if (req.method !== 'POST') return secureJson(req, LIBRARY_ERROR, 405);
    try {
      const bearer = bearerHeader(req);
      if (!bearer) {
        deps.log(requestId, 'auth_rejected');
        return secureJson(req, LIBRARY_ERROR, 401);
      }
      const user = await deps.authenticate(bearer);
      if (!user) {
        deps.log(requestId, 'auth_rejected');
        return secureJson(req, LIBRARY_ERROR, 401);
      }
      const body = await readBoundedJson<Body>(req);
      const mapped = mapLibraryRequest(body, user.id);
      if (!mapped) {
        deps.log(requestId, 'request_rejected');
        return secureJson(req, LIBRARY_ERROR, 400);
      }
      const result = await deps.rpc(mapped.rpc, mapped.args);
      if (result.error) {
        deps.log(requestId, 'rpc_rejected');
        return secureJson(req, LIBRARY_ERROR, 503);
      }
      const rows = Array.isArray(result.data) ? result.data as Record<string, unknown>[] : [];
      if (mapped.action === 'categories') {
        return secureJson(req, { categories: rows.slice(0, 100).map((row) => ({ category: memberSafeText(row.category, 120, 'Replay'), resourceCount: Number(row.resource_count ?? 0) })) });
      }
      const limit = Number(mapped.args.p_limit ?? 0);
      return secureJson(req, { items: mapRows(mapped.action, rows), hasMore: limit > 0 && rows.length === limit });
    } catch (error) {
      deps.log(requestId, error instanceof Error && ['request_too_large', 'invalid_json'].includes(error.message) ? 'request_rejected' : 'internal_error');
      const status = error instanceof Error && error.message === 'request_too_large' ? 413 : error instanceof Error && error.message === 'invalid_json' ? 400 : 500;
      return secureJson(req, LIBRARY_ERROR, status);
    }
  };
}
