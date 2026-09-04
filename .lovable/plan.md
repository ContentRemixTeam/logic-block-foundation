# Replay Vault library diagnosis (read-only)

## What is failing
Search and playback work, but every `vault-member-library` surface (Browse, Categories, Full transcript, Questions, Saved) fails closed in the signed-in hidden Vault.

## Evidence gathered
- Production logs for `vault-member-library` show only `request_rejected` entries — no `auth_rejected` and no `rpc_rejected`. So the caller is authenticated and the database is never reached; the request is refused by the function's own request-shape validation.
- Your direct SQL proof already confirms all five RPC signatures, the service_role execute grants, and healthy QA rows (browse 3, categories 3, transcript 3, questions 0, saved 2). That rules out the database layer.
- The origin gate is shared with `search-mastermind-resources` and `get-mastermind-playback-link`, which both succeed from the same browser origin, so the origin allowlist is not the cause.
- Current project source `_shared/vaultMemberLibraryR4.ts` accepts a `preview` key in the allowlist for every action, and every client call site (`VaultLibrarySurfaces.tsx`, `VaultCallQuestions.tsx`, `VaultTranscript.tsx`, `MastermindCurriculumTranscript.tsx`) always sends `preview: vaultPreviewEnabled()`. The `preview` key was introduced in the later source commits (preview toggle / saved-parity work); an earlier deployed build of this function has a strict "unknown key => reject" allowlist that does not contain `preview`.

## Most likely mismatch
The deployed `vault-member-library` build is older than the current project source. Because the mapper rejects any body key not in its allowlist, the `preview` field the app now always sends makes every request fail validation with HTTP 400 and the generic `Replay Vault request unavailable` body, logged as `request_rejected`. Error category: request-shape rejection from a stale deployed function version, not auth, not CORS, not RPC, not runtime crash.

Note: the deployed version identifier is not exposed to me through available tooling; the conclusion is drawn from the log taxonomy plus the source/client contract, and it is confirmable by the verification step below.

## Smallest function-only repair
1. Redeploy `vault-member-library` from the current, unchanged project source (`supabase/functions/vault-member-library/index.ts` + `_shared/vaultMemberLibraryR4.ts`). No code edit, no schema change, no config change — `verify_jwt` stays as configured.
2. Verify immediately after deploy with two authenticated calls to the same action: one body including `preview` and one omitting it. Both should return 200 with items. If the `preview` body still 400s while the plain body succeeds, the deployed bundle did not pick up the shared file and the follow-up is to redeploy with the shared module refreshed.
3. Confirm the four UI surfaces load, and re-check the function logs contain no new `request_rejected` entries.

## Fallback if redeploy alone does not fix it
If both bodies still fail after redeploy, the next narrow check is the request-shape guard `hasPrivateShape` against the exact body the client sends per action, then the cursor decoder — both are inside the same shared module and would be a one-line, function-only correction. No database or access change is warranted in any branch of this diagnosis.

## Guardrails honored
Read-only inspection only. No code, deploy, publish, database row, secret, entitlement, or launch-setting change was made. No secret values, tokens, user IDs, Dropbox locators, transcript text, or member data are included here.
