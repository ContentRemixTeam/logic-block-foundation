# Live Coaching Queue — call-ready MVP (revised)

Note: the prompt file on your Mac isn't reachable from here, so this plan is built from your pasted scope plus this revision. Phase-two work (transcripts, Zoom identity, community analysis, AI summaries, emails, weekly reports, automated reconciliation) is explicitly out.

## Privacy model (resolves the realtime conflict)

No public/anonymous read access to the queue tables at all. The public page calls one sanitized read-only endpoint that returns **only**: opaque entry id, display-name snapshot, status, position, quick-question flag, kiddos flag, and who is currently being coached. The page **polls that endpoint every 3 seconds** — no realtime subscription on the private table. Questions, emails, member ids, planner user ids, context answers, priority fields, and coach notes never leave the server.

## 1. Public queue page at `/coaching`

- Reachable by link, no login required.
- Closed state: calm "the queue isn't open right now" message.
- Join: pick your name from a dropdown of **active Mastermind members**, sourced server-side from the existing `entitlements` table (tier `mastermind`, active, not expired) — the same source `check_mastermind_entitlement` uses. `member_access` is not used for roster.
- On join the member chooses:
  - **Full coaching** or **Quick question** ("a two-minute-or-less request").
  - Readiness, with your exact wording:
    - "I'm ready to be coached—I'm in a quiet enough place, have a stable internet connection, and can turn on my microphone."
    - "Save my place—skip me for now."
  - Optional checkbox: "I'm on the call with kiddos."
- Optional coaching context (private to the coach): what have you tried, current offer and price, niche or ideal customer, relevant metrics, website, sales page, Instagram and other social links, anything else Faith should know.
- After joining, the member holds a private entry token (in their browser) and can change readiness at any time. "Save my place" retains **all** priority data and their original submission time.
- Public list shows ordered names + status only, and marks the person **currently being coached**.

### Statuses
`ready`, `temporarily_unavailable`, `currently_coaching`, `coached`, `left_call`, `not_reached`.

## 2. Priority rules (computed, with manual override)

Ordering among members whose status is `ready`, in this order:

1. Never received full coaching (`full_coaching_count = 0`)
2. Previously attended but wasn't reached (`not_reached_count` descending)
3. Longest since last full coaching (`last_full_coached_at` ascending, nulls first)
4. Joined within the first 10 minutes of the queue opening (`joined_on_time = true`)
5. Submission time (`submitted_at` ascending)

`temporarily_unavailable` members keep their computed rank and reappear in place when they return. The coach can override with move up / move down, which sets a `manual_order` that wins over the computed sort.

Persisted per member (in a `live_coaching_member_stats` row keyed by entitlement/member reference): `last_full_coached_at`, `full_coaching_count`, `not_reached_count`. Persisted per entry: `submitted_at`, `joined_on_time`, `manual_order`, `status`, `entry_type`.

**Quick questions never touch `last_full_coached_at` or `full_coaching_count`.** They're recorded as completed quick questions only, so eligibility for full coaching is unchanged. The coach can convert a quick question to full coaching in the cockpit, at which point it counts as full coaching.

Marking someone `not_reached` at end of call increments `not_reached_count`, which raises their priority the next time they attend and submit.

## 3. Coach dashboard (admin-only)

Authorization uses the existing admin pattern — the `is_admin` security-definer RPC, checked server-side in every coach endpoint. Mastermind entitlement alone never grants access, and hiding the nav link is not treated as authorization.

- Open / close the queue (opening stamps `opened_at`, which drives the 10-minute on-time window).
- Full ordered list with statuses, quick-question flags, kiddos flags, and computed priority reasons.
- Manual reorder.
- Set `left_call` / `not_reached`.
- Open a member's **Coaching Cockpit**.

## 4. Coaching Cockpit

- Member header with a **"wrong person? change member"** control so a mis-selection is correctable before saving.
- **Start Coaching** and **Finish Coaching** as separate controls, each stamping its own timestamp. Start sets status `currently_coaching` and surfaces that person on the public page; Finish sets `coached`.
- Convert quick question → full coaching.
- Planner context pulled where available, each block rendering an "not recorded yet" placeholder when missing so nothing breaks:
  - current 90-day goal and cycle
  - current milestone
  - recent weekly reviews / check-ins
  - recent wins and metrics
  - previous live coaching sessions
  - outstanding coaching commitments (open coach-assigned tasks)
  - saved offer, website, sales page, social links
- The member's submitted context answers.
- **Private coach notes** — never member-visible.
- **Coach takeaway** — member-visible. Stored separately from the member's own takeaway; neither ever overwrites the other.
- **Assign tasks**: 1–5 tasks with due dates, created by an admin-authorized backend function that resolves the planner `user_id` server-side and dedupes by source + text + date. If the planner match isn't confident, the whole task block is **disabled with a clear explanation** — coaching still saves normally.

## 5. Public debrief form

Fields: active-member name dropdown, biggest takeaways, decision made, repeatable tasks with due dates, confidence level, what could prevent follow-through, follow-up support requested, what was most helpful, clarifications, optional feedback/win plus a sharing-permission checkbox.

It attaches to that member's most recent compatible **completed** coaching session. If no unambiguous match exists, the debrief saves with a `needs_review` flag for staff rather than guessing an attachment. Repeatable tasks flow through the same deduped, server-resolved task path.

## Technical notes

- New tables (RLS on, explicit grants, no `anon` grants): `live_coaching_sessions`, `live_coaching_queue_entries`, `live_coaching_records`, `live_coaching_member_stats`, `live_coaching_debriefs`. Kept entirely separate from the existing self-coaching `coaching_entries` table.
- Queue entries store an entitlement/member reference, a **nullable** planner `user_id`, and a display-name snapshot. No raw email column unless a member has no entitlement match; public responses only ever expose an opaque entry id.
- Three edge functions: `coaching-queue-public` (sanitized read + token-scoped join/status writes), `coaching-queue-coach` (all coach actions, `is_admin`-gated), `coaching-debrief` (public submit with matching/flagging).

## Sequencing and the time box

Migration first, and I'll confirm it applies cleanly before building UI. Build order: public queue → coach dashboard + cockpit → debrief → task assignment. If task assignment can't be verified before your call, it ships **disabled with an explanation** rather than risking tasks written to the wrong account.

## Verification I'll run and report
1. A member can join and appears in the public order.
2. A readiness change updates the public list (within one poll cycle) without a refresh.
3. Opening a member from the coach list loads the correct cockpit.
4. A test task lands in the correct planner account.
