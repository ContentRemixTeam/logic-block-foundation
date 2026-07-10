# Pre-launch hardening — running status

## Batch 1 — SHIPPED ✅

### §0 Name bug (root cause fix)
- **Migration**: `user_profiles.first_name text` (nullable) added.
- **New `src/lib/displayName.ts`**: single source of truth — profile.first_name → user_metadata.first_name → user_metadata.full_name first word → `null`. Email prefix is **never** used.
- **New `src/hooks/useDisplayName.ts`**: query-cached, 10-min staleTime.
- **Fixed surfaces**:
  - `PersonalizedGreeting` (was: `email.split('@')[0]` → "Info")
  - `TodayCommandCenter` (was: same email fallback)
- **Name capture**:
  - Onboarding welcome step now has optional "What should we call you?" field, saves to `user_profiles.first_name`.
  - New `ProfileSettingsCard` in Settings — user can set / edit / clear their name any time.

### §2/§3 partial coverage this batch
- Settings now leads with a proper Profile card (name + email) instead of a bare Account block.
- Onboarding welcome step no longer greets from email.

Typecheck: **passing**.

---

## Batch 2 — Security hardening (NEXT TURN)

Not yet started. Will run `supabase--linter` (already surfaced 9 pre-existing SECURITY DEFINER warnings during the Batch 1 migration — those are known and will be reviewed here), then:
- Verify RLS on `integration_tokens`, `daily_battery_checkins`, `user_feature_preferences`, task archive columns.
- Dedupe overlapping policies on `error_logs`, `ai_connection_keys`, `user_api_keys`, `admin_users`.
- Tighten `error_logs`: require `user_id` on new inserts.
- Provision/revoke edge functions: shared-secret + rate limit audit.
- MCP tool handlers: re-audit user scoping.
- Auth pages: uniform "invalid email or password" (no user enumeration).

## Batch 3 — Performance + stability re-verification + full launch report (TURN AFTER)

Not yet started. Will baseline bundle size, add route-level lazy loading for Extra Features, lazy-load heavy libs (pdf/charts/confetti), audit global providers (`useArcade` mount), tighten hot queries, then re-verify offline queue / Fresh Start / battery persistence and write the final launch-readiness report with before/after numbers.

---

## Remaining §1/§2/§3 audit work folded into Batches 2 & 3
The broader UX/onboarding/settings audit (empty-state coverage, terminology sweep, help-content sweep, Settings reorganization into named groups) will land in Batch 3 alongside the perf pass — same files, same test run, less churn.
