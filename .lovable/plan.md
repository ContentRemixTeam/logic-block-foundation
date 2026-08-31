# P0 Replay Vault playback diagnosis (read-only)

No code, deployment, data, or control changes were made. All findings below are aggregate/equality facts only; no locators, URLs, file IDs, emails, user IDs, or transcript text are included.

## 1. Resource count vs distinct media identity

- Replay Vault portal resources: 1,293; every one has an active playback attempt (1,293 distinct attempt bindings).
- Across those active attempts: 1,292 distinct Dropbox file identities and 1,211 distinct content hashes.
- Admin-preview projection: 1,293 rows, 1,293 distinct resource IDs, 1,292 distinct file identities.
- Conclusion: media identity is effectively 1:1 per resource. There is no shared-locator defect in the database.

## 2. The three tested resources

All three resolve to three distinct media identities and three distinct content hashes (equality check only, no identifiers returned). One is APPROVED, two are DRAFT admin-preview.

## 3. Expected duration vs bound media duration

| Resource | Bound media duration |
|---|---|
| membershipio:32g93JgxNo | 4,141 s |
| Yes Supply EFT Tapping item | 635 s |
| ninety-day-goal-setting-introduction | 663 s |

Projection duration matches the media-attempt duration in all three cases. The browser reported 4,141 s for all three, which matches only the first resource.

## 4. Recent playback calls (last 10 minutes)

- Playback audit events: 4 events across 3 distinct resources.
- Those 3 resources map to 3 distinct file identities and 3 distinct durations (635 s min, 4,141 s max).
- So the server resolved a different resource, a different locator, and a different duration on each call. Edge responses were HTTP 200; the deployed function still returns 401 without a bearer token.

## Root cause

Server side is correct and is not the cause. The RPC returned three distinct rows with three distinct locators; the identical 4,141 s media at 840 s is client-side player state in the Replay Vault page:

1. `recoverySnapshotRef.current.time` is only ever set (on refresh/recovery) and never cleared for a fresh, non-recovery source. `handleLoadedMetadata` then force-seeks every newly loaded video to that stale position — this is the persistent 840 s.
2. The `<video>` element is re-keyed on `sourceGeneration`, but the source URL is applied via a child `<source>` element with no explicit `load()`. When the previous media is still buffering/decoding, the element can keep presenting the previously loaded stream (its duration, 4,141 s) even though the page title and transcript, which come from freshly fetched state, correctly update.

Combined, these produce exactly the reported symptom: metadata changes per resource, media does not.

## Smallest safe fix recommendation

Frontend-only, no backend/controls touched:

1. In `src/pages/ReplayVault.tsx`, reset `recoverySnapshotRef.current = { time: 0, shouldResume: false }` on every non-recovery `resolvePlayback` (alongside `resetForSource()`), so a new resource starts at its own authoritative start.
2. In `src/components/replay-vault/VaultPlayer.tsx`, set the source directly on the `<video src=...>` and key it by the playback URL identity (or call `videoRef.current.load()` after the source changes) so a new protected URL always forces a fresh media load.

No migration, no function deploy, and no change to launch state, publication, entitlements, or member visibility is required.
