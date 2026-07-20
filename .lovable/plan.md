# MCP OAuth 2.1 Upgrade — Plan

## Goal
Let claude.ai custom connectors (OAuth-only) connect to the planner's MCP server while keeping the existing Personal Access Token (PAT) path working for Claude Code / Codex / Cursor.

## Key research findings (MCP spec 2025-06-18 + our stack)

1. **MCP spec** requires: unauth request → `401` + `WWW-Authenticate: Bearer resource_metadata="<url>"`; that URL serves `oauth-protected-resource` metadata pointing at an `authorization_server`; the authorization server publishes `oauth-authorization-server` metadata with `authorize`, `token`, and (ideally) `registration` endpoints; PKCE S256 required; token audience must equal the MCP resource URL.

2. **Supabase already ships an OAuth 2.1 authorization server** (activated with `supabase--configure_oauth_server`). It provides authorize / token / JWKS / dynamic client registration and a consent-page hook at `/.lovable/oauth/consent`. Building our own AS is explicitly discouraged in Lovable's knowledge — we should use Supabase's.

3. **Routing constraint (Supabase-specific):** edge functions live under `https://<ref>.supabase.co/functions/v1/<name>`. Claude fetches `<resource-origin>/.well-known/oauth-protected-resource`. Two viable options:
   - **(chosen)** Advertise the MCP resource as `.../functions/v1/mcp` and serve the well-known documents from the *same function* at sub-paths (`/functions/v1/mcp/.well-known/oauth-protected-resource`). The MCP spec allows path-scoped resource metadata; Claude follows the `resource_metadata` URL from the `WWW-Authenticate` header, so it does not require root-hosted well-knowns.
   - Alternative (rejected): host well-knowns via a Vite public route — breaks in preview and adds a second origin.

4. **PAT compatibility:** Supabase-issued OAuth JWTs and our existing PAT hashes are different token shapes. The MCP function needs a dual verifier: try OAuth JWT (verify signature + issuer + audience against Supabase JWKS) → fall back to PAT lookup in `integration_tokens`. Both resolve to a `user_id` used for RLS-scoped queries.

5. **`@lovable.dev/mcp-js` vs. hand-written function:** the current `supabase/functions/mcp/index.ts` is hand-authored with 13 tools. Migrating to mcp-js would auto-generate the function and gain OAuth verification for free — but mcp-js's default verifier rejects tokens without `client_id` (i.e. PATs would break), and rewriting 13 tools is a large surface change. **Decision: keep the hand-written function, add OAuth ourselves, keep dual auth.** We accept the extra code in exchange for zero regression on the PAT path.

## Implementation

### 1. Activate Supabase OAuth server
- Call `supabase--configure_oauth_server` (no params).
- Add consent route at `src/pages/OAuthConsent.tsx` mounted at `/.lovable/oauth/consent`. Uses `supabase.auth.oauth.{getAuthorizationDetails, approveAuthorization, denyAuthorization}`. Preserves `authorization_id` through login/signup/social redirects. Calm branded copy: *"Allow your AI assistant to view and manage your planner."*
- Ensure `/login` and social OAuth `redirect_uri` re-consume the `next` param so unauthenticated visitors return to the consent screen.

### 2. Discovery on the MCP function
Extend `supabase/functions/mcp/index.ts` to route on path:
- `GET /functions/v1/mcp/.well-known/oauth-protected-resource` → JSON:
  ```json
  {
    "resource": "https://<ref>.supabase.co/functions/v1/mcp",
    "authorization_servers": ["https://<ref>.supabase.co/auth/v1"],
    "bearer_methods_supported": ["header"],
    "scopes_supported": ["mcp"]
  }
  ```
- `GET /functions/v1/mcp/.well-known/oauth-authorization-server` → proxy Supabase's `/auth/v1/.well-known/oauth-authorization-server` (Claude sometimes fetches it relative to the resource).
- Any unauth POST/GET to the MCP endpoint returns:
  ```
  401
  WWW-Authenticate: Bearer resource_metadata="https://<ref>.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource"
  ```

### 3. Dual bearer verification
New helper `verifyBearer(req)` in the function:
1. Extract `Authorization: Bearer <token>`.
2. **Try OAuth JWT:** verify signature via cached Supabase JWKS (`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`); require `iss === https://<ref>.supabase.co/auth/v1`, `aud` contains our MCP resource URL, `client_id` claim present, not expired. Return `{ userId: claims.sub, kind: 'oauth' }`.
3. **Fall back to PAT:** hash → look up `integration_tokens` where `revoked_at IS NULL`, bump `last_used_at`. Return `{ userId, kind: 'pat' }`.
4. Neither → return the 401 + WWW-Authenticate response.

All 13 existing tools already scope by `user_id`; no changes needed there.

### 4. Refresh + revocation
- Refresh tokens are Supabase-managed — clients rotate via `/auth/v1/token`. No app code required.
- Revocation: extend the existing Settings UI to list active OAuth grants. Query Supabase's `auth.oauth_clients` / grants tables via a small edge function `list-oauth-grants` and `revoke-oauth-grant` (service-role, scoped by `auth.uid()`). Sign-out already invalidates the session and any grants tied to it.

### 5. Settings UI — two clear paths
Rewrite `src/components/settings/AIAssistantSection.tsx`:

**Path A — Claude (recommended)** [default expanded]
- Big "Connect Claude" card with numbered steps and exact copy from the request (URL copy button, screenshots-in-text for Settings → Connectors → Add custom connector, Connect, + menu). Three example prompts.
- "Connected assistants" table: client name, granted, last used, [Revoke] per row.

**Path B — Claude Code, Codex & other tools (advanced)** [collapsed by default]
- Existing PAT create/revoke UI, unchanged. Per-client JSON snippets for Claude Code, Codex, Cursor with the PAT and MCP URL prefilled.

Warm, non-technical copy on Path A. Advanced framing on Path B.

### 6. Verification
- Curl: unauth POST → assert `401` + correct `WWW-Authenticate` header.
- Curl: `GET .../mcp/.well-known/oauth-protected-resource` and `.../oauth-authorization-server` return valid JSON with matching issuer.
- Run MCP Inspector against the URL: complete PKCE flow through Supabase's authorize/token endpoints, verify `tools/list` and one `tools/call` (e.g. `get_today`) succeed with the resulting access token.
- Refresh: sleep past `expires_in`, refresh, retry — same 200.
- Revoke via new Settings row → next `tools/call` returns 401.
- PAT path: existing token still returns 200 on `tools/list`.
- Cross-user isolation: two accounts, each connector only sees its own tasks.

### 7. Document in `.lovable/plan.md`
Under a new "MCP OAuth" section: the well-known routing choice (path-scoped under `/functions/v1/mcp/`), the dual-verifier design, and the reason we didn't migrate to `@lovable.dev/mcp-js` (PAT preservation).

## What I need from you before I start

**One decision** — everything else follows the plan above:

**Migrate to `@lovable.dev/mcp-js` now, or keep the hand-written function?**
- **Keep hand-written (recommended, in the plan above):** zero risk to PAT users, ~1 file of new OAuth-verifier code, 13 tools untouched.
- **Migrate to mcp-js:** cleaner long-term, gets OAuth "for free" via `auth.oauth.issuer(...)`, but requires rewriting all 13 tools as `defineTool` files and losing PAT support unless we shim it (mcp-js rejects tokens without `client_id`).

Reply "keep" or "migrate" and I'll ship it.
