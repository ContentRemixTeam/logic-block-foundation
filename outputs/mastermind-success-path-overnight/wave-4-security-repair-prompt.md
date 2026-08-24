# Wave 4 Immutable-Review Security Repair

Worktree: `/Users/faithhawks/Developer/Mastermind Scaling/worktrees/mastermind-success-path-results-overnight-20260822`
Rejected immutable candidate: `d2f64f997860e3726c573b9999bc3f4ac06cc380`
Accepted Wave 3 source: `396febb31cdb5497ae8016b918edc4939f979fca`

You are the sole implementation writer. Repair only the exact Wave 4 critical/high findings below. Do not commit, push, deploy, apply production migrations, seed/publish real curriculum, mutate entitlements/SaaS/GHL/Searchie, expose members, or start Wave 5. Preserve all 74 Replay Vault protected files and migration chronology. Leave the tree uncommitted for parent verification.

## Rejected-candidate findings to close

### A. Immutable receipt can contradict replay decision

At migration 197 around `resolve_assigned_learning_playback`, an existing `(user_id, request_id)` receipt is reused after live authority revalidation even when the stored decision/reason/authority differs. Real PG16 proved:

- denial under QA drift → restore QA → identical request returned `allowed` with the old immutable denial receipt;
- allowed → revoke/drift → identical request returned `denied` with the old immutable allowed receipt.

Repair the model, not just the response:

- retain append-only history;
- payload conflict remains fail closed for same user/request with changed bound payload;
- serialize the exact user/request under advisory lock;
- compute live authority every evaluation;
- if the latest receipt has the same request hash, decision, safe reason, and authority hash as live authority, replay that exact receipt;
- if live authority differs, append a new sequential/superseding evaluation receipt for the same request rather than reusing an opposite receipt;
- return only the receipt whose stored decision/reason/authority exactly matches the response;
- concurrent exact evaluations converge to one latest matching receipt, without duplicate transition receipts;
- denial→allow, allow→denial, allow→changed-authority-allow, and unchanged exact replay are all auditable and tested;
- browser responses still expose no receipt/hash/private authority.

Use an idempotent migration shape that applies twice. If altering the table, preserve history and add exact constraints/indexes/FKs. No UPDATE/DELETE escape hatch on receipts.

### B. Authorization is not fenced across Dropbox mint

The edge handler currently authorizes once, mints externally, and returns a four-hour URL. A mocked revocation during `mintDropboxLink` still returned HTTP 200.

Repair with a post-mint authority fence:

- first service authorization returns private `authorization_receipt_id` and `authority_sha256` in an exact producer schema;
- mint the link;
- call the live authorization RPC again with the same verified user/cycle/item/request;
- return playback only if the second decision is allowed **and** its stored receipt ID + authority hash exactly match the first allowed authorization;
- any capability/receipt/item/catalog/QA/publication/revocation/path/action drift, decision transition, mismatch, RPC error, or malformed second response fails closed and does not return the URL;
- test revocation injected during mint, authority-hash rotation during mint, denial→allow during mint, and second-call outage;
- no URL, locator, receipt, hash, or secret in logs/errors.

### C. Open producer schema

The service RPC producer accepts unknown fields. A real handler probe added `unknownProducerField='PRIVATE'` and still returned HTTP 200.

Add an exact private producer parser/validator used on **both** pre- and post-mint RPC results. It must enforce exact allowed key sets and types for allowed and denied/conflict responses. Reject unknown/missing fields, invalid UUID/hash/decision/reason/provider/locator/title, nullability drift, unexpected locator on denial, and opposite receipt data. The test and mutation control must mutate the real mocked RPC producer path, not a reconstructed browser object or static-only token.

### D. Locator and playback-host allowlists

A URL-shaped private locator was sent to the Dropbox dependency, and a mocked `https://evil.example/...` result was returned to the browser.

- Accept only the exact supported Dropbox locator format (for example `id:<Dropbox file id>` with a bounded strict grammar, or the exact supported canonical path grammar if truly required). Reject URLs, schemes, control chars, traversal, ambiguous whitespace, and unsupported locators before any Dropbox call.
- Validate the minted playback URL with `URL`; require HTTPS and the exact Dropbox temporary-content host allowlist actually produced by the provider. Reject credentials, fragments, unexpected ports, non-HTTPS, foreign/subdomain-confusion hosts, malformed URLs, and overlong values.
- Add adversarial executable tests for URL locator, traversal/path confusion, evil returned host, lookalike host, credentials, nonstandard port, HTTP, and valid Dropbox host.
- Update mutation controls so relaxing either validator breaks the aggregate while source tokens remain.

### E. Helper function PUBLIC execution false-green

Removing the revoke for `success_path_learning_authority(uuid,uuid,uuid,timestamptz)` leaves default PUBLIC EXECUTE, enabling an authenticated cross-owner call that returns private locator authority, while static/focused/full chronology gates pass.

- Revoke every migration-197 private/helper/trigger function from PUBLIC, anon, authenticated, and service_role unless it is an explicitly documented narrow caller boundary.
- Exact grants: authenticated may execute only the member-safe combined resolver; service_role may execute only the assigned-learning playback authorization boundary; helpers remain non-executable directly by all caller roles.
- Add exhaustive native effective `has_function_privilege` assertions for every migration-197 function signature and role, including PUBLIC/default grants.
- Add static exact-ACL bindings and a synthetic mutation control that removes or weakens the private-authority-helper revoke and must fail static + native gates.
- Execute a real authenticated cross-owner helper-call negative control.

### F. True concurrency evidence

The prior committed PG verifier was serial. Add real simultaneous PostgreSQL sessions/processes for:

- exact same allowed request;
- exact same denied request;
- same request during a controlled authority transition if deterministic;
- changed payload conflict racing exact payload.

Prove one matching latest receipt per state, no duplicate state-transition receipts, exact response/receipt consistency, and no deadlock/unique violation/false allow.

## Required verification

Update static/native/edge/mutation verifiers and generated types/contracts exactly. Run and report:

- Wave 4 static;
- native PostgreSQL 16 focused suite, including all new adversarial receipt/ACL/concurrency probes;
- complete 197-migration chronology and candidate double-apply;
- edge tests and lint;
- mounted 320/360/390 suite (must retain the accepted focus-handoff race repair);
- Wave 4 aggregate and executable mutation controls;
- full `npm run verify`;
- TypeScript, focused lint, production build;
- Replay Vault protected baseline 74/74 and protected controls;
- `git diff --check`, secret scan, absolute-host-path scan;
- exact Git status and all untracked files.

Update the Wave 4 receipt/tracker with a rejected-candidate repair section and write `wave-4-security-repair-final-message.txt`. Do not erase earlier evidence; supersede it explicitly. Final classification remains **parent-verifiable private source repair candidate**, never accepted/production/pilot/editorially ready.