# Wave 4 — Offer-First Protected Planner Learning Private Vertical Slice

Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`
Branch: `hermes/mastermind-success-path-results-overnight-20260822`
Accepted Wave 3 implementation source: `396febb31cdb5497ae8016b918edc4939f979fca`
Wave 3 documentation lock/current base HEAD: `50e26d4daf312e12821e4c2ba7ff7f5327d625ce`

You are the sole implementation writer. Inspect accepted Waves 1–3, `MastermindHub`, routes, generated types, Replay Vault edge/media primitives, and existing verifier conventions before editing.

Do not commit, push, deploy, apply production migrations, seed real/member curriculum, publish, mutate SaaS, expose members, change entitlements, alter GHL/Searchie, or start Wave 5. Preserve all 74 Replay Vault protected files and exact migration chronology.

## Governing result loop

> One 90-day result → one confirmed bottleneck → one current milestone → one necessary learning resource → one canonical Planner action → evidence → Continue / Improve / Reduce / Support.

This wave is a private source candidate for one **Offer** vertical slice. It is not a course library, Replay Vault route, production launch, or editorial approval. Current real curriculum has zero `Ready` rows; do not promote candidates or add real publication data. PostgreSQL/UI tests may use clearly synthetic `ready` fixtures only.

## Locked ownership boundaries

- Planner/Wave 3 owns the result, confirmed stage/milestone, one canonical action/task, evidence, evaluation, support, recovery, and receipts.
- Wave 2 owns immutable versioned Planner Learning catalog and frozen per-cycle assignments.
- Wave 4 presents one safe current assigned lesson and its protected playback in the gated Mastermind Success Path.
- Replay Vault remains a separate annual/lifetime discovery product. Monthly assigned Learning must never depend on Replay Vault entitlement or expose Vault route/catalog/search/Saved/counts/transcript/discovery metadata.
- Learning playback may reuse generic private-media transport primitives only. It needs a separate assignment-bound authorization boundary and audit context.
- Watching is diagnostic learning telemetry. It cannot complete a Planner task, evidence receipt, milestone, or evaluation.

## 1. Member-safe combined slice resolver

Add one post-Wave-3 migration with a server-owned authenticated RPC such as `resolve_my_success_path_learning_slice(p_cycle_id uuid)`.

The RPC must derive `auth.uid()` and return a **closed response schema**. It must revalidate:

- `mastermind.learning.assigned` capability, including denied versus verification-unavailable;
- same-owner cycle;
- current accepted Planner receipt;
- active frozen Wave 2 assignment and catalog authority;
- confirmed Wave 3 path only (null recommendation remains unconfirmed and reveals no lesson);
- exact active assignment item equals Wave 3 `active_assignment_item_id`;
- item/catalog are active, `item_state='ready'`, all QA fields approved, QA receipt present, not item/catalog revoked, and publication authority/hash remains exact;
- one current same-owner canonical action/task and current path/state receipt.

Allowed member-safe success projection only:

- safe state/reason;
- cycle/path version and state receipt needed for exact mutations;
- confirmed stage and current milestone title/key;
- one canonical action: action ID, task ID, bounded action text, estimated minutes, completion state;
- one primary Learning presentation: opaque assignment item ID, bounded title, intended output, action prompt, evidence prompt, teacher, attribution;
- support state and latest safe evaluation outcome if needed.

Do **not** serialize assignment/catalog/media/transcript/playback/publication IDs or hashes, canonical resource IDs, provider IDs, private locators, source-native/provenance identifiers, item counts, alternate titles, placements, Vault metadata, search/discovery data, or unrelated assigned items.

Denied, expired, unavailable, review-required, unconfirmed, stale receipt, malformed, revoked, non-ready, cross-owner, no-current-action, or no-current-item states must use a strict allowlisted empty envelope and expose none of the success projection.

Do not use client-supplied email, user ID, stage, milestone, assignment, or resource ID as authority.

## 2. Assignment-bound Learning playback authorization

Add a narrow **service-role-only** RPC such as `resolve_assigned_learning_playback(p_user_id uuid,p_cycle_id uuid,p_assignment_item_id uuid,p_as_of timestamptz)`.

It must revalidate all slice authority at request time and bind the exact:

- user/cycle/path/current action;
- active assignment + assignment item;
- catalog/item `ready` and QA/publication authority;
- required assigned-Learning capability;
- frozen canonical resource/media/transcript/playback/publication hashes;
- private media row source-content hash and provider locator.

Return a private service projection only: exact assignment item/title, provider, private locator, and bounded duration/transport fields genuinely needed to mint playback. No browser role may execute it or read its source tables.

Create a separate append-only Planner Learning playback authorization/audit receipt, or one transactional authorization boundary that records allowed/denied decision without raw locators, URLs, emails, credentials, or Vault authority in logs/member responses. Same request ID must be hash-bound and concurrency-idempotent; changed payload conflicts. Revoke direct table rights—including service_role where narrow RPCs are intended—from PUBLIC/anon/authenticated/service_role. Prove only exact service RPC execution remains.

Playback authorization must fail immediately after entitlement loss, Planner receipt rotation, path/item reroute, item/catalog revocation, QA/publication drift, or malformed authority.

## 3. Separate Edge function

Add an edge function such as `get-assigned-learning-playback` rather than reusing `get-mastermind-playback-link` unchanged.

Requirements:

- strict allowed-origin handling and bounded request body;
- authenticated JWT validation; derive user ID from the verified session;
- body accepts only cycle ID, opaque assignment item ID, and stable client request ID;
- service calls the new assignment-bound RPC;
- provider allowlist and safe temporary-link minting using existing secret-safe Dropbox mechanics where appropriate;
- no caller email authority;
- no Vault access-decision call, Vault playback event, search, transcript, questions, Saved, or annual entitlement dependency;
- closed browser response: assignment item ID, safe title, provider, short-lived playback URL, expiry, and optional safe duration only;
- `private, no-store`, no raw locator or secret in response/log/error;
- inaccessible/denied/revoked/cross-owner states are indistinguishable 404-style responses; verification/provider outages use honest unavailable copy without implying entitlement loss;
- no send/publish/payment/access/CRM/member mutation or external webhook.

Use dependency-injected/pure handler seams and edge tests with mocked auth, RPC, Dropbox, and network canaries. Prove only approved Dropbox token/link endpoints can be called and zero forbidden hosts/methods are touched.

## 4. Offer-first mounted member slice

Build a dedicated component/hook for the exact `/mastermind/success-path/:cycleId` route. Do not use `/admin/mastermind-replacement-preview` as a foundation.

For this route, replace static/local-storage curriculum recommendations with the server combined resolver. Do not fetch the entire assignment list in the browser.

The primary surface must show only:

1. one saved 90-day result (from canonical Planner state if safely available);
2. confirmed Offer stage and one current milestone;
3. one primary lesson;
4. the same one canonical Planner action;
5. one evidence checkpoint;
6. Continue / Improve / Reduce / Support;
7. one support route.

The lesson player:

- opens only after the slice resolver grants the current item;
- invokes the separate assigned-Learning playback edge function;
- uses a protected HTML5 video surface with `playsInline`, `controlsList`, no download claim, short-lived URL refresh, preserved position during refresh, and honest retry states;
- never mounts Vault search, full transcript, Questions Answered, Saved/bookmarks, related replays, library counts, or Vault branding;
- offers an explicit “Back to my action” focus/scroll handoff to the same action card;
- does not create or complete tasks/evidence/milestones from watch state.

Evidence/evaluation UI must call existing Wave 3 RPCs with exact path/action/version IDs, stable client request IDs retained across ambiguous retries, server receipt/readback before success, and clear stale/conflict recovery. No optimistic “saved” copy.

`Reduce` shrinks the action only. `Support` creates/links support work. No control silently reroutes stage or milestone. Do not expose direct arbitrary stage/milestone selection on this protected execution route.

## 5. Honest states and isolation

Implement distinct mounted states:

- loading;
- denied/ineligible;
- verification unavailable;
- no plan;
- unconfirmed recommendation;
- review required/stale;
- assigned resource not ready (generic non-clickable message, no title/metadata);
- playback loading/unavailable/expired-refresh;
- evidence pending/saved/conflict/ambiguous failure;
- support open;
- low-capacity reduce;
- return after absence.

A load failure must never look like empty onboarding. A playback failure must not imply membership loss. A lesson view must not claim progress or milestone completion from watch percentage.

Ordinary Planner routes must remain byte/behavior standalone-safe: no Mastermind labels, navigation, locked previews, item counts, stage/milestone, Learning, media, Vault authority, or upgrade prompts. The exact Success Path route remains behind existing authenticated + Mastermind gating plus the new server resolver.

Remove the unconditional Replay Vault button/label from the monthly Mastermind success-path experience. If retaining any Vault link elsewhere, it may render only after an independent server-verified annual/lifetime Vault capability; denied/monthly/unavailable callers receive zero Vault label/count/route metadata and no upgrade prompt.

## 6. Accessibility, mobile, and calm UX

- Test mounted behavior at 320, 360, and 390 CSS px; no horizontal overflow or clipped primary controls.
- Minimum 44px touch targets for primary actions.
- Keyboard-operable lesson/action/evidence/evaluation controls.
- Focus moves to player/action/error/status appropriately.
- `role=status`/`aria-live` for loading, playback refresh, saves, and receipts; `role=alert` for actionable failures.
- Visible focus, non-color-only states, reduced-motion-safe behavior, named video/player and form controls.
- One primary CTA per state; optional/contextual material progressively disclosed.

## 7. Verification

Add Wave 4 static, native PostgreSQL 16, edge, and mounted UI verifiers, package scripts, and repository aggregate wiring.

Behaviorally prove at minimum:

### Database/privacy/personas
- active monthly assigned Learning succeeds without Vault entitlement;
- active annual succeeds but gets the identical one-item Learning projection (no extra Vault data);
- expired, nonmember, verification unavailable, review required, cross-owner, stale Planner receipt, unconfirmed path, malformed state, non-ready item, item revoked, catalog revoked, publication/QA drift all return exact metadata-free envelopes;
- only exact current item/action resolves; other assigned/unrelated item direct requests fail;
- service-only playback RPC and all-role ACL/destructive privilege denial;
- same-request concurrency returns one authorization receipt; changed payload conflicts;
- revocation/receipt/reroute races fail closed;
- executable privacy mutation injects unknown/private fields into the real resolver/edge producer, governing closed-schema assertion fails, rollback/restoration passes, and static negative controls reject local-object shortcuts.

### Edge/no side effects
- verified JWT identity wins over body data;
- malformed/oversized/cross-origin requests fail before external calls;
- mocked Dropbox allowed path works with short-lived URL;
- RPC denial causes no Dropbox call;
- provider outage is honest and secret-safe;
- no Vault RPCs or forbidden external side effects/hosts;
- response schema rejects unknown fields and all locators/authority metadata.

### Mounted UI
- exact route uses server resolver, not static `MASTERMIND_PORTAL_RESOURCES` or local-storage pins;
- monthly DOM contains no Replay Vault, library/search/Saved/transcript/count/locked/upgrade metadata;
- one lesson/action/evidence/support route only;
- watch events do not complete task/evidence/milestone;
- canonical action remains one task and “Back to my action” works;
- evidence and each evaluation outcome require server receipt/readback;
- stale/conflict/ambiguous failures retain input/request ID and never render saved;
- low-capacity, absence, denied, unavailable, review-required, non-ready, playback refresh/failure states;
- 320/360/390 widths, keyboard, focus, live regions, no overflow.

### Aggregate/chronology
- full chronological PostgreSQL through every migration, now 197 if one migration is added;
- candidate apply-twice after complete predecessors;
- inherited Wave 1/2/3 suites remain green;
- TypeScript, focused lint, production build, full `npm run verify`;
- Replay Vault protected baseline 74/74 and mutation controls;
- aggregate mutation control proves `npm run verify:mastermind-wave4` fails when executable DB/edge/UI behavior is broken while source tokens remain.

## 8. Artifacts and completion

Update generated TypeScript contracts exactly. Add:

- `outputs/mastermind-success-path-overnight/wave-4-verification-receipt.md`;
- concise `wave-4-final-message.txt`;
- build tracker update;
- exact package scripts and verification files.

Run what sandbox permits and report exact blocked parent-only gates honestly. Run `git diff --check`, secret scan, absolute-host-path scan, and reconcile all generated/untracked files. Leave the tree uncommitted for parent verification and immutable review.

No production/member/editorial claim is allowed. The final status is at most **parent-verifiable private source candidate**, not beginner-ready, pilot-ready, or launch-ready.