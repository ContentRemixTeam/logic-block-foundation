# Mastermind Portal, Vault, and 90-Day Planner — Critical Audit and Rebuild Plan

**Date:** 2026-09-03
**Scope:** Full read of the planner core, execution loop, Mastermind curriculum layer, Replay Vault, and app-wide architecture in `ContentRemixTeam/logic-block-foundation` (1,029 source files, 234K lines, 129 edge functions, 223 migrations). Read-only audit; no code changed.
**Companion notes in the Business Brain:** `Success Path Personalized Curriculum Member Experience - 2026-08-08`, `Mastermind Curriculum Framework Ownership and Architecture - 2026-08-07`, `Member Portal and Planner App Project - Current State`.

---

## 0. The one-paragraph verdict

The product spec in the Business Brain is right. The code does not implement it. What exists today is a static six-stage roadmap with a first-match keyword classifier, a 140-field setup form that silently loses members' drafts, an execution loop whose levels are linked only by copied text strings, and a vault of 1,292 raw Zoom recordings with filename titles and no editorial layer. Around all of that sits an unusually heavy security, provenance, and QA apparatus (hash-bound publication, three-reviewer Q&A approval, 16 verify scripts, two-email allowlists in three places) that protects content nobody can find and gates a curriculum that is not custom. The team has been polishing the vault door while the room behind it is empty. Members will pay thousands for one thing: a plan that becomes one clear move each week, Faith's answer to their exact problem in six minutes, and someone noticing when they go quiet. None of those three loops closes in the current code.

---

## 1. What members actually need (before any code)

The member is an ADHD woman solopreneur. From her side, the Mastermind is worth thousands a year only if it does these five jobs better than a course library or a Facebook group:

1. **Turn my 90-day goal into one doable move this week.** Not a curriculum map. One move, with a low-battery version.
2. **Let me report what happened in under a minute** and adjust the next move based on that. Evidence in, next move out.
3. **Give me Faith's coaching on my specific stuck point** at the moment I'm stuck. "Faith has coached this before" is the vault's entire value proposition. A 90-minute replay is not.
4. **Notice when I disappear** and give me a smaller restart, without shame.
5. **Show me proof I moved** at 30, 60, and 90 days so I renew because I can see it.

Every recommendation below is judged against those five jobs. Anything that does not serve one of them gets hidden or cut.

---

## 2. Critical findings by layer

### 2.1 The 90-day planner core (`/cycle-setup`, `/cycle-wizard`)

**Two competing setup flows write the same table and damage each other.** `/cycle-setup` (`src/pages/CycleSetup.tsx`, 5,471 lines, 9 steps, ~140 inputs) writes six tables. `/cycle-wizard` (10 steps) writes only `cycles_90_day` plus generic tasks. The dashboard's "Edit Plan" button routes to the wizard (`Dashboard.tsx:432`), which on edit nulls every strategy, offer, and revenue field the setup flow created (`CycleWizard.tsx:88-135`). Cycle view routes edits to the setup flow, which on update never re-writes offers, promos, revenue plan, or month plans (`CycleSetup.tsx:1345-1445`) and never loads them for editing. A member who edits her plan loses half of it either way.

**The draft system destroys drafts.** The resume dialog checks `hasDraft` in a mount effect before the async draft load resolves (`CycleSetup.tsx:672-689`), so it never opens. One second later the auto-save fires with the empty default form and merges blanks over the server draft (`CycleSetup.tsx:879-1010`, `useCycleSetupDraft.ts:352-360`). Opening the page overwrites the plan she was building. This one bug alone explains "I lost my plan" support tickets and also makes the dashboard "Continue Your Setup" banner appear for people who never typed anything.

**Data the form collects is never saved.** Nurture method is never set in the new flow (only `nurturePlatforms` mutates), so `cycle_strategy.nurture_method` is null for every new cycle, nurture automation is permanently greyed out, and `auto-setup-cycle` creates zero nurture tasks (`CycleSetup.tsx:3686-3898`, `:5449`). Key messages, planning level, lead platform goal, and email check-in preference have no column at all. "Other" is stored literally instead of the custom value (`CycleSetup.tsx:1416`). Offer `sales_frequency` enum values in the UI don't match the switch in `auto-setup-cycle:905-1020`, so offer task generation always hits the default branch.

**Server creates fake plans.** `get-current-cycle-or-create` silently inserts a placeholder cycle ("My 90-Day Goal", 5/5/5 scores) for any signed-in user without one, using the service role. The real setup then creates a second overlapping row. `get_current_cycle` picks by latest start date. The Success Path has to special-case the placeholder string. Rendering `CycleSnapshotCard` can create a cycle as a side effect.

**Creation is non-atomic and non-idempotent.** Twelve sequential client-side inserts, `console.error` on failure, no rollback, a two-attempt retry with no idempotency key (`CycleSetup.tsx:1531-1554`), and recurring tasks without a `template_key` so a retry duplicates 90+ tasks.

**Schema accreted rather than designed.** `cycles_90_day` has ~65 columns via 12 ALTER migrations: 15 metric columns instead of a child table, promotions stored three times, nurture stored twice in one row, `supporting_projects` overloaded and then overwritten by the end-of-cycle summary (`save-cycle-summary:96-103`). `create-cycle-from-wizard` inserts four columns that do not exist and has zero callers. No constraint prevents overlapping cycles.

**Auth shortcut is a loaded gun.** `auto-setup-cycle`, `save-cycle-summary`, `get-cycle-summary`, `get/save-monthly-review`, and 13 other functions base64-decode the JWT without verifying it, then use the service-role key. They are safe only because the gateway default `verify_jwt=true` runs first. 35 functions already set `verify_jwt=false`; the first person who copies that stanza creates an account-takeover.

**Timezones.** DATE strings parsed as UTC midnight then formatted locally in six components; edge functions compute "today" in UTC. US members see dates one day early and evening saves schedule first tasks for tomorrow.

### 2.2 The execution loop (Today, This Week, reviews)

**The chain goal → month → week → day → task → review is not linked by IDs anywhere.** Weekly priorities are a JSONB string array. Daily plans store the priority *text* the member checked, so an edit breaks the link. Weekly "mark done / drop" only fire toasts and persist nothing. There is no record of whether a weekly priority was achieved.

**Three Top 3 stores disagree.** `daily_plans.top_3_today` (text), `tasks.priority_order + scheduled_date`, and `daily_top3_tasks` (FK). Daily Plan writes the first two with different contents. CEO Weekly reads the first, Daily reads the second, the arcade pet reads the third. A member completes all three tasks and the CEO view still shows three unchecked strings.

**Completion is broken at the query level.** `manage-task` sets `is_completed` but never `status='done'`; `get-weekly-plan` counts `status==='done'` (`:292, :358`), so every member's weekly execution summary shows 0/N completed. Priority is text (`high|medium|low`) but the same function tests `priority <= 3`, so `priorityTotal` is always zero.

**Reviews measure visits, not reflection.** `get-weekly-review` and `get-monthly-review` insert a blank row on page load, then the dashboard treats row-presence as "review completed." `save-monthly-review` writes `challenges` into `habit_trends` and `lessons` into `thought_patterns` while `get-monthly-review` reads the proper columns, so saved monthly reviews reload empty. `month_score` is destructured and dropped. `Reviews.tsx:116` queries month `202609`; rows are written as `9`. "30-Day: Not started" forever.

**Dead features members think are working.** The Weekly Focus card on Daily Plan queries weeks starting Sunday; the server creates weeks starting Monday. It never renders. The nurture check-in cron has no schedule anywhere in the repo, no auth (service role, publicly callable), compares day-of-week in UTC, and its "Yes I sent it" path writes to a different table than the cron reads. The re-engagement layer is therefore a client-side gap detector that only runs when the member opens the app, which is precisely when she doesn't.

**Top-3 tasks are excluded from the 30-day review** because the daily create call never passes `cycle_id` and the monthly review filters on it.

**Surface bloat.** Five different weekly artifacts (`weekly_plans`, `weekly_reviews`, `weekly_reflections`, `weekly_scorecards`, `weekly_goals`), four week-planner components, four daily schedulers, a 1,909-line Daily Plan page with ~24 stacked cards and seven always-on banners. For an ADHD member this is the opposite of "pick the next small move."

**Can you compute on-track / stuck / drifting today?** Stuck: partially (reschedule loops, but the counter is written by two disagreeing code paths). Drifting: weakly. On-track: no. There is no structured link between work done and the goal.

### 2.3 The Mastermind curriculum / Success Path

**It is not custom.** Personalization is (a) one of six branches chosen by a first-match substring scan over `biggest_bottleneck` in fixed order offer → find → nurture → sell → deliver → leverage, (b) the goal string echoed as a headline, and (c) the member's own low-energy sentence echoed back. "I can't sell my program" routes to Offer because `program` matches before `sell`. `'close'` matches "closer", `'system'` matches "ecosystem". Confidence is "high" whenever the bottleneck field is non-empty regardless of match quality (`mastermindSuccessPath.ts:355-456`). An empty plan and a rich plan usually produce the same Offer → "Pick the thing you're selling" screen. The UI copy claims the opposite ("The app uses your plan and current bottleneck to choose the next constraint", `MastermindHub.tsx:670`).

**All curriculum content is code.** Six stages, 24 milestones, per-milestone round scripts, resource-to-milestone maps, seven AI packs, and the classifier live in TypeScript. The DB columns `stages` and `success_paths` on `mastermind_portal_resources` exist but are never read; the DB only says which of 23 videos are playable. Faith cannot change a milestone label without a deploy and edits to three verifier scripts that pin resource IDs.

**No member state dimension.** One current milestone is stored per cycle. No completion history, no "done" flag, no evidence pointer, `capacity_mode` declared and never written. "Record evidence" navigates to `/evidence` with no milestone context. "Add this weekly move" dedupes via `localStorage` (duplicates across devices) and never reads task completion back. Weekly Review does not read or write the snapshot. Nothing the member does changes what she sees next except manually clicking a different milestone.

**Broken mappings.** `offer-buyer` points to a `pending_import` external resource. `leverage-choice` points to the Faith AI settings page. `leverage-constraint` and `leverage-simplify` both point to the same workshop. Four Sell/Find videos are mapped to no milestone. Three resources do double duty for Find and Nurture, so finishing Find pre-completes half of Nurture. Nurture has one video of its own.

**AI layer.** AI Studio calls no model; it string-templates the cycle into markdown for the member to paste into her own ChatGPT. Locked packs render their full internals; only the copy button is gated. All six stage packs are `status: 'quality_gate_required'` and nothing checks status. The coach proxy is honest BYO-key but has no rate limit, CORS `*`, and encrypts stored keys with a key derived from the public user ID.

**Gating.** Server-side entitlement (`check_mastermind_entitlement`, `mastermind_media_access_decision`, 4-hour Dropbox links) is solid. Client-side, the same two-email allowlist is copy-pasted in `App.tsx`, `MastermindGate.tsx`, and `AdminPreviewGate.tsx`. `VITE_ENABLE_MASTERMIND_90_DAY_PLAN` is unset, so no member can see the portal. Flipping that one flag launches curriculum to all active entitlements because the curriculum surfaces ignore `launch_state`.

### 2.4 The Replay Vault

**Excellent plumbing, no product.** Hash-bound publication authority, fail-closed RPCs, idempotent watch ledgers, scrubbed member-facing strings. And: 1,292 resources with filename-derived titles, `stages` and `success_paths` empty for every row (`build-membershipio-replay-vault-import.py:523-524`), `search_summary` equal to "Vault replay in {playlist names}", call date regex'd from the title and never shown, thumbnail always null, no chapters, no summaries, no takeaways, no speaker, no format tag. Sorted by import time, so every item shows "Recent".

**Search returns sentence fragments.** A "moment" is one VTT cue (2–6 seconds); the snippet is ≤48 words of that cue. The global top-500-cues prefilter runs before the scope join, so common words starve vault results. No synonyms, no embeddings. A member searching "funnel" will not find "email sequence".

**"Questions Faith Has Answered" is a fantasy workflow.** Regex extractor, per-candidate CLI, three different human reviewers per question, `human_curated` origin enforced by trigger. Live published count: zero. At 1,292 calls × ~10 questions, this never ships.

**No link to the plan.** The only bridge between stage and replays is six two-word strings (`sell: 'sales pricing'`) used for the 30-day replays page. The coaching-context RPC already exposes goal, focus area, and bottleneck; nothing consumes them for the vault. Search events are never written, so there is no data on what members can't find.

**Watch state doesn't feed anything.** Full-replay playback records nothing (`target_kind` is moment or question only). No "continue watching," no "unwatched," no recommendations. Curriculum progress lives in a separate incompatible table.

**Scale and security.** Transcript panel loads a 90-minute call in 15–25 serial round trips. Access decisions run per row (4–5 lookups each) on every search, browse, and category load. Playback returns a bare Dropbox temp link with no rate limit on minting; a member can script 1,292 calls and mirror the library in an afternoon.

### 2.5 App-wide

This is roughly six apps sharing one router: the planner, the Mastermind portal, a 12-wizard business-in-a-box (33K lines, 14% of the codebase), a BYO-key AI copywriting studio (~16K lines), a gamification layer (pets, arcade, seasons wrapping every page), and public workshop funnels that belong in GHL. The sidebar shows 27 items across tiers.

`tsc` passes only because `strict: false`. ESLint: 785 problems including three `rules-of-hooks` violations. Zero tests for the planner; all tests protect the vault. 101 of 129 edge functions use the service-role key and hand-filter by `user_id`, so RLS is bypassed for essentially all planner data and every missed `.eq` is a cross-tenant leak. Four AI-generation functions have no auth at all and burn `LOVABLE_API_KEY` for anyone on the internet. Offline sync discards the member's edit on 409 while reporting "synced." Three lockfiles, `.env` committed, Sentry installed and never imported.

---

## 3. Stop doing this

These consume the team's attention and do not move any of the five member jobs:

- Building more QA gates, verify scripts, hash-bound publication paths, or reviewer workflows for content that has no editorial layer yet.
- Adding wizards, AI packs, arcade features, seasonal effects, or workshop funnels to this app.
- Debating hidden-launch flags. The entitlement RPC exists; the flag debate is a proxy for "the thing behind the flag isn't ready."
- Treating the three-reviewer Q&A pipeline as the path to "Questions Faith Has Answered." It will produce zero.
- Running signed-in "playback/checkoff QA" on a curriculum whose recommendation engine is a substring match.

---

## 4. Target design

### 4.1 Member-facing information architecture

Regular Planner (standalone-safe, five items):

1. **Today** — 90-day goal, this week's move, Top 3 from tasks, one-click done, evening note. Five blocks, not 24.
2. **This Week** — three structured priorities linked to the plan, the schedule, the 60-second review.
3. **My 90-Day Plan** — the plan, month focus, metrics, 30/60/90 review.
4. **Tasks & Projects**
5. **Inbox** — brain dump, open loops, notes, ideas, wins in one place with tabs.

Account, Support, and the Community link live in the avatar menu.

Mastermind section (appears only after server-verified entitlement):

- **My Success Path** — the home. Goal, current focus stage (member-confirmed), current milestone, this week's move, evidence so far, one "Faith has coached this before" card, one support action.
- **Learn** — the core curriculum organized by milestone, showing only the current milestone's 1–3 lessons plus "next in your path." Full six-stage map available behind "See everything," never by default.
- **Ask Faith** — the searchable answer library (chapters, not calls), plus "bring this to coaching" that saves the question with plan context.
- **Coaching & Community** — call schedule, RSVP, prep, recent replays, Community link.
- **Vault** — annual/lifetime only. Search, collections auto-built from problem clusters, continue watching, saved.

Hide by flag now, delete later: the 11 non-cycle wizards, AI copywriting and Brand DNA, editorial calendar, arcade/pets/seasonal/quest providers, SOPs, habits page, courses (fold into Learn), Google Sheets, MCP server, Asana, five of seven mindset pages. Delete outright: effects demo, planner mockups, launch-v1, `Index.tsx`, the eight public workshop/trial/join routes (move to GHL), `debug-mindset-data`, `cleanup-mindset-data`, `create-cycle-from-wizard`.

### 4.2 The custom curriculum engine (how the 90-day plan drives what she sees)

**Step 1: capture structured signal in setup.** Replace the free-text-only inputs with about twelve typed questions that live inside the one remaining cycle wizard (they are Mastermind-neutral business facts, so they belong in the regular planner):

| Question | Type | Stage signal |
|---|---|---|
| Do you have an offer you can sell today? | yes / almost / no | Offer |
| Price of the main offer | number | Offer, Sell math |
| Paying customers right now | number | Deliver |
| Sales in the last 90 days | number | Sell vs Offer |
| Email list size | bucket | Find vs Nurture |
| Primary discovery channel | enum | Find |
| How often do you email your list? | enum | Nurture |
| Hours per week you can actually give this | number | Capacity mode |
| The thing eating most of your time | enum: creating content / selling / delivering / admin / deciding | Leverage vs others |
| Biggest constraint in your words | free text | tiebreaker, LLM wording |
| Revenue goal and sales needed | numbers (already exist) | Sell math |
| 90-day outcome, observable proof | free text (already exist) | headline |

**Step 2: deterministic scoring, not first-match.** Score all six stages from the structured fields with explicit rules (no offer or no price → Offer high; offer and audience but zero sales → Sell; sales but customers stalling → Deliver; sales and delivery working and time eaten by admin → Leverage; small list and no channel → Find; channel active but list not warming → Nurture). Free text is a weighted tiebreaker with word-boundary matching, not a substring scan. Return the top two stages with the evidence that produced each, and the confidence. The member confirms or corrects inside the Mastermind section, exactly as the spec says. AI may reword the explanation in Faith's voice; it may not pick the stage.

**Step 3: freeze a per-cycle curriculum snapshot.** `member_curriculum_snapshot(user_id, cycle_id, stage, confirmed_by_member, milestone_id, capacity_mode, ranked_lessons[], action_ideas[], weekly_move_task_id, created_at)`. Everything on My Success Path renders from this row, so what she sees is traceable to her answers.

**Step 4: milestone state per member.** `member_milestone_progress(user_id, cycle_id, milestone_id, status, evidence_ref, started_at, completed_at)`. "Mark this round done" with one evidence line. Completion of the linked planner task projects into this table server-side (the one-way bridge in the spec). Advancement suggests the next milestone; it never silently moves.

**Step 5: the weekly pulse closes the loop.** Thirty seconds, four buttons ("did it / some progress / didn't get to it / plan changed") and one friction picker. Stored per cycle in `member_weekly_pulse`. Friction → one recommendation: a lesson, a Faith answer chapter, a low-battery version, or "bring this to coaching." Repeated friction across three pulses is the only thing that proposes a stage change, with explanation and confirmation.

**Step 6: curriculum content moves to tables.** `curriculum_stages`, `curriculum_milestones`, `curriculum_lessons`, `lesson_resource_map`, seeded from today's TypeScript, edited through the existing Admin page. Provenance columns (source recording, excerpt, owner, status) per the Faith-teaching standard.

### 4.3 The vault as an answer engine

The unit of value is the chapter, not the call and not the caption cue.

1. **Enrichment job** over all 1,292 transcript versions: cut into 3–8 minute chapters at topic shifts; per chapter generate title, two-sentence summary, the question being answered, three takeaways, one action step, stage/milestone/problem tags, guest attribution, evergreen score, and an embedding. Bind to the transcript SHA so the existing publication authority still governs it. Roughly 20M input tokens, one-off, cheap.
2. **Batch approval, not per-item triple review.** A human spot-checks a sample per batch; members get a "report this" button. Reserve the heavy review for a few hundred "Faith-verified answer" badges.
3. **Problem clusters from data.** Embed all chapter questions, cluster to ~50, have the model name them, map to stage/milestone. These replace the ten hand-typed playlists and become the member-facing collections that grow automatically.
4. **Hybrid search on chapters.** Full-text plus pgvector, rank-fused, with stage/format/date facets. Drop the global 500-cue prefilter.
5. **Plan connector.** `recommend_chapters(user_id)` reads the curriculum snapshot's stage and milestone, embeds the bottleneck text, filters by milestone, excludes watched, returns three with a one-line "why for you." Surface it on My Success Path and at the top of the Vault. This is "Faith has coached this before" built from data instead of from a two-word query.
6. **Real dates, real progress.** Event date from the Membership.io manifest, resource-level watch state merged with curriculum progress into one learning ledger, "continue watching."

### 4.4 Proof of results

A nightly job writes `member_weekly_state(user_id, week_id, plan_made, top3_completion_pct, priority_completion_pct, reschedule_loops, days_active, pulse_status, evidence_count, metric_delta, state)` where state is on_track, stuck, drifting, or gone. This single table powers three things the business needs: a coach dashboard for Faith, the re-engagement trigger to GHL (email or DM when state flips to drifting or gone), and the 30/60/90-day member report that makes renewal obvious.

---

## 5. Sequenced plan

Effort assumes one strong engineer plus AI agents, and that Phase 0 starts immediately.

**Phase 0 — stop the bleeding (week 1)**
- Lock the four unauthenticated AI generators or delete them with the wizards.
- Replace `getUserIdFromJWT` with `auth.getUser` in the 18 functions. Add `_shared/auth.ts` and `_shared/cors.ts`.
- Fix the draft clobber: gate auto-save on a touched flag, run the draft check after `hasDraft` resolves, never auto-save in edit mode.
- Remove the placeholder-cycle auto-create; return null and show the real empty state.
- Fix `status='done'` on completion and the `is_completed` / `priority='high'` reads in `get-weekly-plan`.
- Hide wizards, AI copywriting, arcade/seasonal providers, workshops, courses, SOPs, habits behind flags in one PR.
- Replace the three email allowlists with `check_mastermind_entitlement`.
- `.env` to `.gitignore`, one lockfile, remove unused deps.

**Phase 1 — one plan, linked by IDs (weeks 2–4)**
- One setup flow on the wizard skeleton with ~25 typed fields including the twelve stage-signal questions. Delete `CycleSetup.tsx`, `useCycleSetupDraft`, `cycle_drafts`.
- Server-side transactional create with idempotency key; invalidate `active-cycle`.
- `weekly_priorities` table with status and `tasks.weekly_priority_id`. One canonical Top 3 (tasks). `cycle_id` on every task and review.
- `completed_at` on reviews; stop auto-inserting on GET; unique constraints; fix monthly review column mapping.
- One timezone policy (client local date passed to every function).
- Daily page cut to five blocks; one week planner; one scheduler.

**Phase 2 — vault enrichment (weeks 2–6, parallel track)**
- Chapter, summary, tag, question, embedding enrichment for all 1,292 resources. Batch approval gate.
- Problem clustering → collections.
- Chapter-level hybrid search with facets. Real dates. Transcript fetch in one call.
- Rate-limit playback-link minting; plan the move to a signed CDN origin.

**Phase 3 — the custom curriculum (weeks 5–8)**
- Curriculum tables plus admin editor, seeded from current TS. Fix the broken milestone mappings during the seed.
- Deterministic stage scorer with 30-sentence test suite. Snapshot at cycle creation. Confirm/correct step in the Mastermind section.
- `member_milestone_progress`, evidence linkage, task-completion bridge.
- Weekly pulse with friction → one recommendation.
- `recommend_chapters` on My Success Path and Vault.

**Phase 4 — proof and launch (weeks 8–10)**
- `member_weekly_state` nightly job, coach dashboard on `/admin`, drifting/gone → GHL workflow.
- 30/60/90 member report.
- Planner test floor: vitest plus two-user RLS tests per edge function.
- Launch to entitled members through the RPC gate. No feature flag debate.

---

## 6. Decisions only Faith can make

1. **Approve the cut list in 4.1.** Hiding the wizards, AI copywriting, arcade, and workshops is the single biggest lever for both member focus and engineering speed. This is reversible (flags), but the team needs the call.
2. **Approve killing `/cycle-setup` in favour of one wizard-based flow with ~25 typed fields.** This drops roughly 115 inputs members are asked for today. Some of that data (fear response, commitment statement, three days of tasks with essays) is meaningful to Faith's teaching; it can return later as optional Mastermind-side prompts, not as required planner steps.
3. **Approve LLM enrichment of the vault with batch approval** instead of the three-reviewer-per-question process. Without this the answer library never exists.
4. **Confirm the twelve stage-signal questions** (table in 4.2). They are the intake for the custom curriculum; wording should be Faith's.
5. **Note:** the Business Brain note `00-Canonical/Mastermind Success Path Learning Product Requirements - 2026-08-24` that the handoff cites as canonical is an empty stub (frontmatter only). The 2026-08-08 spec is the real requirements document and should be pointed to instead.

---

## 7. Appendix — detailed findings by file

### Planner core
- `src/pages/CycleSetup.tsx:672-689` draft dialog dead; `:879-1010` auto-save clobbers; `:1345-1445` edit path drops tables; `:1416` "other" stored literally; `:1531-1554` non-idempotent retry; `:3686-3898` nurture method never set; `:5449` automation permanently disabled.
- `src/hooks/useCycleSetupDraft.ts:279-314, 352-360` async race, blank merge.
- `src/pages/CycleWizard.tsx:88-135` edit nulls strategy tables.
- `supabase/functions/get-current-cycle-or-create/index.ts:97-114` placeholder cycle insert.
- `supabase/functions/create-cycle-from-wizard/index.ts:62-71` inserts non-existent columns; no callers.
- `supabase/functions/auto-setup-cycle`, `save-cycle-summary:8-25`, `get-cycle-summary` unverified JWT decode; `auto-setup-cycle:905-1020` enum mismatch; `:1267` weekly blocks TODO counted as automation.
- Date bugs: `CycleView.tsx:248`, `CycleManagement.tsx:89-95`, `CycleProgressBanner.tsx:21-22`, `CycleCommandCenter.tsx:143-144`, `CycleSnapshotCard.tsx:73-74`, `CycleFocusBanner.tsx:37`.
- `useActiveCycle.tsx` 5-minute cache never invalidated by either setup flow.

### Execution loop
- `src/pages/DailyPlan.tsx:181,205` Sunday vs Monday week start (card never renders); `:609` wrong month-in-cycle; `:581,642,779,814` UTC/local mix; `:676-684` no `cycle_id` on Top-3 create; `:560` reload window drops edits.
- `supabase/functions/manage-task:445-448, 607-631` never sets `status='done'`; `:497` reschedule counter conflicts with `useRescheduleTracking.tsx:117`.
- `supabase/functions/get-weekly-plan:176, 292, 318, 357-362` wrong scope, wrong completion field, wrong priority type.
- `supabase/functions/get-weekly-review:187-200`, `get-monthly-review:129-150` blank row on GET; `save-monthly-review:52, 86-90` drops score, wrong columns; `save-weekly-review:113` upsert without a unique constraint.
- `src/pages/Reviews.tsx:116` month key mismatch.
- `supabase/functions/nurture-checkin-cron:15-18, 61` no auth, no schedule, `.single()`; `contentService.ts:384` counts a type the CHECK forbids.
- `src/hooks/useServerSync.ts:79` in-flight save drops newer data; `offlineSync.ts:166-173` 409 discards the edit.
- `src/hooks/useTasks.tsx:380` invalidates keys nothing uses; `:717` local-date filter hides UTC-created tasks.
- `supabase/functions/generate-recurring-tasks:212` `.single()` duplicates; `pull-unfinished-tasks:60-64,95` wipes the current week.
- `src/components/weekly-plan/AlignmentCheckSection.tsx:112-116` 1–10 slider vs `save-weekly-plan:165` 1–5 validation.

### Curriculum layer
- `src/lib/mastermindSuccessPath.ts:355-380` keyword rules; `:413-421` first-match with "high" confidence; `:445-456` substring scan; `:458-481` score fallback; `:138-318` resource maps with broken entries (`offer-buyer`, `leverage-choice`, duplicate `do-less-make-more-workshop`).
- `src/data/mastermindPhaseRounds.ts:41-78` static rounds; `:75` settings page as lesson; `:80-91` all `transcript_needed`.
- `src/hooks/useMastermindSuccessPath.ts:66-87, 120, 162-177` inputs, confirmed-stage override, single-milestone snapshot.
- `src/components/mastermind/SuccessPathPlanCard.tsx:56-79, 185-212` localStorage dedupe; `:269-271` generic "why".
- `src/pages/MastermindHub.tsx:79-86` two-word replay queries; `:134-158` nulled fallback cycle; `:166-188` DB used only as playable set; `:670` false personalization claim; `:884` evidence without context; `:1133` duplicate key.
- `src/components/mastermind/AiStudioPlanCard.tsx:46-47, 451-476, 613-683` localStorage answers, cosmetic gate.
- `src/lib/mastermindAiStudio.ts:126` etc. `quality_gate_required` never checked.
- `supabase/functions/mastermind-ai-coach/index.ts:7, 14-30, 49, 73, 119-126` CORS, weak key derivation, models, entitlement.
- `src/App.tsx:173-186`, `src/components/mastermind/MastermindGate.tsx:5`, `src/components/admin/AdminPreviewGate.tsx:12` triplicated allowlist.
- `supabase/migrations/20260829170500:96-104` curriculum surfaces ignore `launch_state`.
- `src/data/mastermindVideoLibrary.ts` 376KB of fake YouTube transcripts.

### Replay Vault
- `src/pages/ReplayVault.tsx:74, 105, 156-186, 198-214, 243-263` preview hard-coded, no stage filter, search results below the fold, playlists as canned queries.
- `tools/build-membershipio-replay-vault-import.py:499-524` empty taxonomy, title-regex dates, playlist-string summaries.
- `supabase/migrations/20260830191115:76-85` empty arrays hard-coded.
- `supabase/migrations/20260901164500_mastermind_media_surface_search.sql:99-130` cue-level moments, global prefilter, per-row access decision `:190-202`.
- `supabase/migrations/20260829133000_replay_vault_admin_preview_catalog.sql:212, 218, 231` per-row access, import-time sort.
- `tools/replay_vault_foundation.py:36, 151-158` regex extractor, three reviewers.
- `src/components/replay-vault/VaultTranscript.tsx:8,12` serial 100-cue pages; `VaultPlayer.tsx:47, 55` cosmetic nodownload, full-replay progress not recorded.
- `supabase/functions/get-mastermind-playback-link/index.ts:37-48` bare temp link, no rate limit.
- `supabase/functions/_shared/replayVaultAccess.ts:21-24` origin check passes when absent.
- Two access authorities: `mastermind_media_access_decision` vs `replay_vault_access_decision`; `get-mastermind-portal-access/index.ts:40-47` falls back only on error.

### App-wide
- `tsconfig.app.json:15-20` strict off; `eslint.config.js:24` unused-vars off; 785 lint problems, 3 rules-of-hooks.
- 101/129 functions on service role; 18 unverified JWT decodes; 35 `verify_jwt=false`; `generate-content-pillars`, `generate-flash-sale-copy`, `generate-platform-content`, `generate-single-post` unauthenticated.
- `supabase/functions/openai-proxy/index.ts:12-33` user-id-derived key encryption; no rate limit on either proxy.
- `vite.config.ts:51-56` vs `:110-111` contradictory SW strategy; `public/sw.js` kill-switch worker.
- `20260309161705` anonymous insert on `workshop_testimonials`.
- Three lockfiles; `.env` committed; `@sentry/react`, `html2canvas` unused.
