
## Context

An MCP (Model Context Protocol) server for the planner is **already built** — users don't have to wait for it. It lives at `/functions/v1/mcp`, uses per-user Personal Access Tokens (hashed in the DB, revocable), and today exposes 7 tools: `get_today`, `get_week`, `get_current_cycle`, `list_tasks`, `create_task`, `update_task`, `add_note`. Settings → **AI Assistant** already has a panel to mint a token and see the connection URL.

This plan is a hardening/expansion pass so it feels production-ready for Claude Desktop, Claude Code, and Codex.

## 1. Verify end-to-end (no-code first, then fix anything broken)

- Hit the live edge function with a real minted token and confirm:
  - `initialize` returns proper protocol version + serverInfo
  - `tools/list` returns all tools with valid JSON Schemas
  - `tools/call` round-trip for `get_today` and `create_task` returns MCP-shaped content
  - Revoked token → 401
  - Missing/invalid token → 401
  - Rate limit (60/min) trips and recovers
  - Cross-user isolation: token A cannot read user B's rows (query attempted via service-role client scoped to token's user_id)
- Confirm CORS headers include `Accept: application/json, text/event-stream` handling and expose `mcp-session-id` (already in code — verify with a live OPTIONS preflight).
- Fix any failures found; do not just note them.

## 2. Expand the toolset

Add write/read tools users will actually want from Claude/Codex:

- `complete_task` — mark a task done (sets `is_completed`, `completed_at`)
- `list_projects` — active projects with id/name/color
- `create_idea` — capture to brain dump / ideas inbox
- `list_ideas` — recent ideas (with optional tag filter)
- `get_weekly_review` — latest weekly review (wins/challenges/adjustments)
- `search_tasks` — text search across active tasks (title + description)

Each: strict Zod-ish JSON Schema in `tools/list`, per-user scoping via token's `user_id` only (never trust client input `user_id`), returns MCP `content: [{ type: 'text', text: JSON.stringify(...) }]`.

## 3. Polish the Settings → AI Assistant UX

- Rewrite `McpConnectionPanel` copy so it's non-technical:
  - "Connect Claude / Codex to your planner in 60 seconds"
  - Big one-tap **Generate token** button; show token ONCE with copy-to-clipboard + a "you won't see this again" warning
  - Show the connection URL prominently, copy button
  - Three collapsible cards: **Claude Desktop**, **Claude Code**, **Codex / other MCP client**
    - Each with a copy-paste JSON snippet pre-filled with the user's URL (token placeholder — never embed the real token in rendered HTML for copy history reasons; user pastes it into the highlighted spot)
  - Troubleshooting section: revoked token, 401, rate limit, "which tools can it call?"
- List active tokens with created date, last-used, and a **Revoke** button (revocation effective immediately — already server-side).
- Add a small "Test connection" button that calls `tools/list` from the browser using the pasted token and shows ✓ / error inline.

## 4. Verify again after changes

- Typecheck passes
- Live curl of every new tool with a fresh test token
- Revoke test token at end of session
- Confirm Settings panel renders correctly at 375px (mobile install audience)

## Technical notes

- No schema changes expected — reuses existing `mcp_personal_access_tokens` (or equivalent) table from the earlier migration.
- New tools are additive edits in `supabase/functions/mcp/index.ts` only.
- No secrets to add — the function already uses `SUPABASE_SERVICE_ROLE_KEY` server-side and scopes every query by the token's user.
- Deferred: OAuth 2.1 flow (Claude web's newer connector UI). Current bearer-token flow works for Claude Desktop, Claude Code, and Codex today; OAuth can be a later batch if you want the "one-click add to Claude web" experience.

## Out of scope

- Any rebrand, unrelated settings changes, or auth surface changes.
- Building an in-app AI chatbot (this is the opposite direction — external AI → your planner).
