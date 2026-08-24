# Wave 3 Critical Repair — Immutable Review Findings

Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`
Accepted Wave 2 source: `25811fdcd2ef74d8425843024575bc845a6e65ea`
Rejected Wave 3 checkpoint: `fa37a180fa2365bbdf8c37a86ac9c8fd2b116749`

You are the sole implementation writer. Do not commit, push, deploy, apply production migrations, seed real/member data, mutate SaaS, expose members, or start Wave 4. Preserve Replay Vault protected scope and inherited chronology.

Repair every confirmed high finding below. Use real PostgreSQL behavior/adversarial tests, not source-token assurances.

## 1. Remove service-role direct table bypass

Final effective ACLs must revoke direct SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on every Wave 3 private/authority/append-only table from PUBLIC, anon, authenticated, **and service_role**. RLS is not sufficient because service_role bypasses it.

Grant service_role only EXECUTE on the exact narrow SECURITY DEFINER RPCs it needs (recommendation/support operations). No direct table mutation/truncation. Test final effective privileges for all four roles and prove denied TRUNCATE/forged append/delete while legitimate RPCs still work.

## 2. Concurrency-correct idempotency everywhere

Every request-key or period-key transition must:
1. check existing receipt;
2. acquire deterministic advisory transaction lock(s);
3. recheck after lock;
4. exact hash replay returns canonical receipt;
5. conflicting payload fails closed.

Repair and test:
- `preview_my_success_path_transition` exact concurrent retries;
- evidence exact concurrent retries;
- absence recovery exact concurrent retries;
- check-ins with **different request IDs but the same period key** converge deterministically on one authoritative period receipt/outcome or typed conflict—not a uniqueness exception;
- update support request lookup scoped by owner/support/request identity so cross-owner request-ID collisions cannot create false conflicts/ambiguous replay.

Use same-request and distinct-request concurrency processes and assert response semantics plus final ledger counts.

## 3. Transition diff must bind all authority and be re-derived at confirmation

The reviewed impact diff must include every activated field and authority, including at minimum:
- transition kind;
- old/new stage;
- old/new milestone;
- old/new action text, action size/capacity;
- old/new assignment ID and assignment item ID;
- catalog version ID/key/content authority and frozen publication/media authority needed to prove exact Learning item;
- preserved/replaced canonical task identity semantics;
- evidence receipt IDs/hashes;
- expected path/state version.

At confirmation, re-read current path + frozen assignment + proposal rows and recompute the canonical server diff/hash from the values that will actually activate. Require recomputed hash equals stored reviewed hash and caller expected hash/diff. A privileged/disposable mutation of proposal columns after preview must fail confirmation, even if append-only triggers are bypassed in a test fixture.

Proposal rows remain append-only/immutable and direct table rights denied, but confirmation must not rely on that alone.

`milestone_advance` must actually change/advance the milestone using the frozen assignment sequence/ordinal and a different valid assignment item. A same-milestone/same-item no-op must be rejected. Reroute semantics must be explicit and may not hide an unreviewed Learning item.

Add adversarial tests for mutated action text, assignment item/catalog authority, same-milestone no-op, backward/invalid item, false/incomplete/reordered diffs, stale path, and valid real advancement.

## 4. Business evidence schema must reject nested watch/task proxies

The current sanitizer only checks top-level keys. Replace arbitrary JSON acceptance with a bounded structured business-evidence schema or recursive validation that rejects forbidden concepts at any depth/key/value, including watch/video/lesson/progress/percentage/task completion/checkmark/playback/transcript/course metadata.

A payload such as `{"metric":"watch_percentage","value":100}` or nested equivalent must fail. Milestone advancement must require eligible observable business evidence, not merely any evidence receipt. Explicitly classify evidence types that can support advancement versus notes/friction/context that cannot.

Test recursive nested keys/values, arrays, capitalization/spacing variants, task-completion proxies, watch-only evidence, and one valid business evidence receipt.

## 5. One active canonical Planner action without deleting history

When reduce, confirmed transition, or absence recovery replaces the current action:
- safely retire the previous generated action from active generation (`generation_active=false` or the repository's canonical neutral retirement mechanism);
- preserve row, `deleted_at IS NULL`, member-authored task text, completion state, and history;
- never have two active incomplete canonical Success Path tasks for one path;
- do not overwrite or delete member-modified/completed/retired rows;
- concurrency/retry may not duplicate active actions.

Tests must assert the old task is preserved but inactive and not deleted, its text/completion remain exact, and exactly one current active task exists after reduce, transition, and absence recovery.

## 6. Resolver validates semantic state before serialization

`resolve_my_success_path` must revalidate, before returning protected metadata:
- confirmed/recommended stage + milestone map to the exact frozen assignment item/snapshot;
- assignment/catalog remain valid and nonrevoked;
- current action belongs to same user/cycle/path and expected logical identity/version;
- evidence/support pointers belong to same owner/path;
- state enum/version/receipt relationships are coherent.

Any constraint-valid but semantically malformed state fails closed with an empty metadata-free envelope. Add disposable mutations for malformed confirmed stage, milestone, action, assignment item, support/evidence pointer, and stale versions.

## 7. Complete denial and timeline privacy oracles

Expand recursive protected response fields/sentinels to include all Wave 3 + Wave 2 authority and member-private fields, including at minimum:
- recommendation_reason and recommendation evidence;
- confirmed/recommended stage and milestone;
- action IDs/text/logical keys/task IDs;
- evidence IDs/types/payload/hashes/notes;
- support IDs/status/reasons/operator notes;
- actor_reference, actor identity/role/internal reasons;
- assignment/item/catalog IDs/keys/content hashes;
- canonical_resource_id, media_asset_id, transcript IDs/version, playback_attempt_id, publication_sha256, private/provider/source locators;
- Learning/Vault titles, counts, placements, labels, discovery/search metadata.

Executable resolver mutation must inject representative omitted private fields (not only action_id), call the real resolver, prove the privacy assertion fails, roll back, and prove restoration. Static gate must bind the asserted response to the executed mutation and reject local-object regression.

Timeline tests must recursively reject actor_reference/identity and all private support operator fields—not only two literal strings. Include executable mutation/adversarial serialization proof where practical.

## 8. Close all verifier false-greens

Native PG tests must additionally prove:
- service_role direct table privilege denial;
- preview concurrent exact retry convergence;
- evidence concurrent exact retry convergence and changed-payload conflict;
- check-in same period with distinct request IDs;
- absence recovery concurrent exact retry convergence;
- proposal mutation after preview blocks confirmation;
- a real milestone advance to a different later frozen item;
- previous canonical task preserved, inactive, undeleted, with member text/completion exact;
- malformed state returns no metadata;
- denial oracle catches recommendation_reason + Wave 2 private authority fields;
- timeline oracle catches actor_reference/internal actor metadata.

Add static anti-regression controls that reject the exact defective patterns reviewers demonstrated. Do not rely only on independent substring presence; bind producer → real response → assertion and include negative mutation controls.

Where generated TypeScript contracts are manually updated, add database information_schema/pg_proc signature and nullability checks sufficient to catch argument/relationship drift; do not claim generated parity from substring presence alone.

## Required final gates

Run what sandbox permits; parent reruns native gates:
- Wave 3 static and native PG16;
- complete chronological PG16 through all migrations with Wave candidate double-apply;
- TypeScript;
- focused lint;
- production build;
- full `npm run verify`;
- Replay Vault 74/74 and all mutation controls;
- `git diff --check`;
- secret/host-path scans.

Update Wave 3 receipt/tracker/final message honestly. Leave tree uncommitted and report exact files, tests, residual blockers, and production status.