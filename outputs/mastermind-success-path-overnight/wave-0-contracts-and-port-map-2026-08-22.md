# Wave 0 Contracts and Selective Port Map

Status: FROZEN FOR PRIVATE SOURCE BUILD
Date: 2026-08-22
Base: `5f4c219cdbcc58b845b0e5d3a7e8d719e64f6ce3`
Accepted behavior reference: `9f9b25f7227469e0009acde2c0d55e7948be479e`

## 1. Governing result loop

One 90-day result → one member-confirmed stage → one active milestone → one primary Planner Learning resource → one canonical Planner task/action → evidence → Continue / Improve / Reduce / Support.

Watching never completes or advances a milestone.

## 2. Product boundaries

- Regular Planner remains complete, standalone-safe, and Mastermind-neutral.
- Planner Learning replaces the GHL curriculum experience only after private parity, member QA, and separate launch approval.
- Replay Vault remains the annual/lifetime membership.io all-call archive and is not the curriculum.
- GHL Community and Events remain external human/community destinations.
- No live access, migration, deploy, publishing, GHL, or portal-retirement action belongs to this branch.

## 3. Current-main findings

`src/pages/CycleSetup.tsx` directly orchestrates writes across 11 tables:

- `cycles_90_day`
- `cycle_strategy`
- `cycle_offers`
- `cycle_limited_offers`
- `cycle_revenue_plan`
- `cycle_month_plans`
- `projects`
- `habits`
- `tasks`
- `user_settings`
- `daily_plans`

Current main is missing:

- `src/lib/cyclePlanReconciliation.ts`
- `src/lib/draftSyncOwnership.ts`
- `src/components/mastermind/MastermindWelcomeWizard.tsx`

Current and accepted versions differ materially for Cycle Setup, Success Path hook/card, draft state, and Mastermind Hub. Wholesale merge/cherry-pick is prohibited.

## 4. Canonical Planner save contract

One browser submission sends one idempotent reconciliation command. The server transaction owns the multi-table write and returns a verified readback receipt.

Required identity:

- authenticated `auth.uid()` derived server-side;
- `cycle_id` for edits;
- durable logical `plan_key` carried in the cloud draft/server contract for first creation;
- unique `request_id` for retry deduplication;
- `payload_sha256` for same-request/different-payload rejection;
- returned `planner_receipt_id`, cycle ID, content hash, and reconciliation summary.

Required behavior:

- two browsers creating the same logical quarter converge on one cycle;
- repeated identical requests return the same result;
- reused request ID with changed payload fails closed;
- completed and member-edited Planner work is preserved;
- removed unfinished generated work is retired, not silently duplicated;
- the browser clears its draft only after receipt readback;
- generated tasks keep stable keys and user/cycle scope.

## 5. Capability contract

Independent server-derived capability keys:

- `planner.base`
- `mastermind.section`
- `mastermind.learning.assigned`
- `mastermind.ask_faith`
- `mastermind.community_link`
- `vault.discovery`
- `vault.search`
- `vault.playback`
- `vault.saved_videos`
- `admin.curriculum_preview`

Mastermind Learning and Vault capability decisions remain independent. JWT identity—not browser email, user ID, or tier—controls authorization. Denial, verification unavailable, and review required are distinct fail-closed states. Denial returns no protected metadata.

## 6. Curriculum authority contract

Editorial authority:

- immutable `curriculum_catalog_versions`;
- normalized `curriculum_catalog_items`;
- explicit `gap | candidate | refresh_required | ready | revoked` state;
- stage, milestone, role/order, output, action/evidence prompt, teacher/attribution, source provenance, privacy/rights review, and Learning capability;
- private media asset reference separated from member-visible Learning publication.

Per-cycle authority:

- one `mastermind_cycle_state` bound to owner, cycle, and exact Planner receipt;
- member confirms or changes recommendation;
- immutable `curriculum_cycle_assignments` and normalized assignment items;
- catalog changes never silently rewrite an active assignment;
- rebuild creates a new assignment, explicit diff, and confirmation.

No GHL lesson becomes `ready` without transcript, provenance, rights/privacy, edit, playback, action, and evidence QA. Overnight Offer fixtures remain synthetic/review-pending.

## 7. Action, evidence, and evaluation contract

- `tasks.task_id` is the only completion authority.
- One active unretired Success Path action per owner/cycle.
- Action binds to Planner receipt, assignment/item, stage/milestone, and stable generation identity.
- Evidence content remains in the canonical Planner evidence store; protected links bind it to the action and historical assignment.
- Check-ins are append-only event-time records: Continue / Improve / Reduce / Support.
- Later rerouting never relabels historical evidence/check-ins.
- Support requests create visible staff work; they are not silent analytics events.

## 8. Learning playback contract

Planner Learning owns a separate catalog, publication context, assignment, progress context, and member UX. It may consume generic secure-media transport without changing Replay Vault product surfaces.

Opening an assigned resource requires:

1. authenticated identity;
2. active Mastermind Learning capability;
3. current assignment/item;
4. current Learning publication/readiness receipt;
5. resource-version-safe short-lived playback contract.

The browser receives no permanent provider locator. Playback failure never blocks the Planner action. Monthly Learning access reveals no Replay Vault catalog, full-call transcript, search, Saved destination, or annual metadata.

## 9. Planned source migration order

Create new post-main timestamps; never reuse the accepted branch’s colliding `20260809160000` filename.

1. transactional cycle reconciliation v2;
2. generalized capability projection and helpers;
3. versioned Planner Learning catalog/publications/assignments;
4. Success Path state/actions/evidence/check-ins;
5. append-only Learning events/outbox and staff projection.

Each migration must pass full predecessor-stack install and double-apply/upgrade tests on disposable PostgreSQL 16 before acceptance. No migration is applied live.

## 10. Selective port map

Port/adapt behavior from accepted reference:

- `src/lib/cyclePlanReconciliation.ts`
- `src/lib/draftSyncOwnership.ts`
- `src/hooks/useCycleSetupDraft.ts`
- `src/components/cycle/SaveStatusBanner.tsx`
- reconciliation portion of `src/pages/CycleSetup.tsx`
- `MastermindWelcomeWizard.tsx`
- `SuccessPathPlanCard.tsx`
- `useMastermindSuccessPath.ts`
- focused Success Path portion of `MastermindHub.tsx`
- reconciliation, behavior, browser, and concurrency tests

Manual merge required:

- `src/App.tsx`
- `src/pages/MastermindHub.tsx`
- `src/pages/CycleSetup.tsx`
- `package.json`
- existing Mastermind verification scripts

Preserve current main:

- Replay Vault route/components/functions/migrations/tests;
- separate annual/lifetime Vault authorization;
- regular Planner routes/data;
- admin replacement preview until formally retired.

## 11. Generated type gate

After the final local schema stack is stable, regenerate or reconstruct typed Supabase contracts. No untyped casts are accepted for final reconciliation, capability, curriculum, assignment, action, evidence, check-in, or Learning resolver operations.

## 12. Verification gates

- dependency lock install;
- TypeScript;
- production build;
- lint;
- focused unit/contract tests;
- PostgreSQL 16 full-stack + double apply;
- persona/RLS/adversarial security matrix;
- mounted browser and mobile 320/360/390 paths;
- exact protected Replay Vault hash comparison;
- independent final acceptance review and substantive repair loop.
