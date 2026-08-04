# Live Coaching Queue — call-ready MVP

Note: the prompt file on your Mac (`/Users/faithhawks/Documents/...`) isn't reachable from here, so this plan is built from the scope you pasted. If the file has extra requirements, paste its text and I'll fold them in.

Scope is deliberately narrow: a working public queue, a coach cockpit, takeaway saving, and safe planner task assignment. Nothing from phase two (transcripts, emails, AI summaries, community analysis, reports) is included.

## What gets built

### 1. Public queue page at `/coaching`
- Open to anyone with the link, no login wall on the page itself.
- If the queue is closed: a calm "the queue isn't open right now" state.
- Join flow: pick your name from a dropdown of **active Mastermind members only** (names only, sourced server-side).
- After joining, a member can set their own status:
  - **Ready**
  - **Temporarily unavailable** (keeps their original place; shown as "stepping away")
  - **Quick question** (a short-answer slot that does **not** cost them their spot for full coaching)
- Public list shows **ordered first names + last initial and status only**. No questions, goals, links, notes, or history are ever exposed publicly.
- Live updates so readiness changes appear without a refresh.

### 2. Coach dashboard (private, coach-only)
- Open/close the queue.
- See the full ordered list with each member's status and whether they're a quick question.
- Manual reorder (move up / move down) plus a simple priority flag.
- Click a member to open the **Coaching Cockpit**.

### 3. Coaching Cockpit
- Member identity header, with a **"wrong person? change member"** control so a mis-selection can be corrected before saving.
- Planner-link indicator: shows whether this member is confidently matched to a planner account.
- **Private coach notes** (never member-visible).
- **Takeaway box** (member-visible summary of the session).
- **Assign tasks**: 1–5 tasks with text + a date. Created through a coach-authorized backend function, deduped so the same task isn't created twice.
  - If no confident planner match, task assignment is **disabled** with an explanation — coaching itself still works and saves.
- **Mark coached**: saves the session, records it in the member's live-coaching history, and advances the queue.

### 4. Public debrief form
- A simple post-call form where a member records what they took away and optionally 1–3 next steps with dates.
- Next steps go through the same deduped task creation path when a planner account is linked.

## Technical notes

- **New tables** (all in `public`, RLS on, explicit grants):
  - `coaching_sessions_live` — one row per call: title, `is_open`, opened/closed timestamps, owner (coach).
  - `coaching_queue_entries` — session ref, member ref (`user_id` nullable + display name + email), `status` (`waiting` / `ready` / `away` / `coached`), `entry_type` (`full` / `quick_question`), `sort_order`, `priority`, join token.
  - `live_coaching_records` — the coached history: session ref, member ref, private notes, member takeaway, coached_at. Kept **separate** from the existing self-coaching `coaching_entries` table so the self-coaching log isn't polluted.
- **Public read** is served by a read-only edge function returning only ordered names + statuses; no anon SELECT grant on the underlying tables that would leak questions or emails.
- **Join / status changes** go through an edge function with a per-entry token, so a public visitor can only mutate their own row.
- **Coach actions** (open/close, reorder, cockpit save, task assignment) run in an edge function that verifies the caller is an admin/coach via the existing `is_admin` check, then inserts tasks with the member's `user_id` server-side — never a client-supplied owner.
- **Member roster** comes from the existing entitlements/`member_access` data, so nonmembers never appear and the planner stays a standalone product for them. The coach entry point is hidden behind the existing Mastermind gating.
- **Live updates** via a realtime subscription on the queue table, scoped so subscribers only receive non-sensitive columns.
- Task creation reuses the existing tasks schema and marks rows with a source so coach tasks and debrief tasks can be deduped.

## Verification before you go live
I'll run these four checks and report results:
1. A member can join and appears in the public order.
2. A readiness change updates the public list without a refresh.
3. Opening a member from the coach list loads the correct cockpit.
4. A test task lands in the correct planner account.

## Explicitly deferred
Transcript processing, Zoom identity/timestamps, community comment analysis, AI summaries, automated emails, weekly progress reports, advanced member intelligence, automated task/debrief reconciliation.
