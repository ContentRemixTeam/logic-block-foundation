# Wave 0 Verification Receipt — Baseline and Contracts

Status: VERIFIED
Date: 2026-08-22
Verified by: parent Hermes session
Base: `5f4c219cdbcc58b845b0e5d3a7e8d719e64f6ce3`
Ownership checkpoint: `fab42a21b53f1d1b4aeb364b3ce253a25fa59f26`

## Delivered

- Exact ownership boundary and overnight tracker committed.
- Current-main versus accepted behavior port map frozen.
- Transactional Planner, capability, curriculum, action/evidence, Learning playback, and migration contracts frozen.
- SHA-256 baseline for 74 protected Replay Vault product files.

## Baseline commands

| Command | Exit | Result |
|---|---:|---|
| `npm ci` | 0 | 750 packages installed from lockfile |
| `npx tsc --noEmit` | 0 | no TypeScript errors |
| `npm run build` | 0 | production build completed in 10.13s; 329 PWA precache entries |

## Exact artifacts

- `outputs/mastermind-success-path-overnight/wave-0-contracts-and-port-map-2026-08-22.md` — SHA-256 `1052a72815383f98a534726cec24924e6f4f068757245794ef1ad415881fd517`
- `outputs/mastermind-success-path-overnight/replay-vault-protected-baseline.json` — 13992 bytes; SHA-256 `a2154199ad0b6b265659ca99c854eb3df244825db0e7a695ebc2a0e4f7b5ad67`
- Protected Replay Vault tracked-file count: 74

## Source findings

- Current `CycleSetup.tsx` directly writes 11 canonical Planner tables.
- Current main lacks `cyclePlanReconciliation.ts`, `draftSyncOwnership.ts`, and `MastermindWelcomeWizard.tsx`.
- Accepted-only migrations collide with current Replay migration timestamps and must be rebuilt with new post-main names.
- Direct merge/cherry-pick of accepted branch remains prohibited.

## Warnings, not Wave 0 failures

- `npm ci` reported three inherited dependency vulnerabilities: two moderate and one high. No breaking `npm audit fix --force` was applied.
- Browserslist data is stale and build chunks include existing >500 kB warnings.
- Intended Supabase project management visibility and production member playback remain unproven; production is blocked.

## Next dependency

Wave 1: build and test the canonical transactional Planner reconciliation on this exact base while preserving protected Replay Vault hashes.
