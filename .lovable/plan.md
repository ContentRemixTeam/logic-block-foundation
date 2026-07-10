# Pre-launch hardening pass

This is six substantial workstreams. Doing all of it in one turn would mean shallow work on every axis (especially security + performance, which need measurement, not just edits). I'm proposing **three sequenced batches**. Reply "go" and I'll ship Batch 1 immediately, then continue.

If you'd rather I compress into one turn and accept shallower coverage on perf + security, say "one turn".

---

## Batch 1 — Name bug + UX/onboarding/settings coherence (§0, §1, §2, §3)

**Name bug (root cause fix)**
- New `getDisplayName(profile)` helper — single source of truth. Sources in order: `user_profiles.first_name` → onboarding-captured name → no name (never email prefix).
- Migration: add `user_profiles.first_name text` (nullable).
- Add "Your name" field to Settings → Profile and to onboarding welcome step (optional, skippable).
- Sweep every name display: `PersonalizedGreeting`, `CelebrationOverlay`, celebration message templates, any invite/email surfaces, tour welcome. Replace ad-hoc email parsing everywhere.

**UX walkthrough (three personas, real fixes only)**
- Verify active nav state, page titles, one-primary-action per screen, ≤2 taps from dashboard to: Today, Tasks, Battery, Brain Dump.
- Terminology sweep: pick canonical labels (90-day cycle, week, day, task, brain dump, bare minimum, battery) and rename inconsistent instances.
- Empty states + disabled-feature pages: every one gets a "here's what to do" primary action (uses existing `EmptyState` primitive).

**Onboarding**
- Run through signup → onboarding → dashboard, fix any friction.
- Every step skippable; capture name in welcome step.
- First dashboard visit: no raw zeros, no error toasts, one clear suggested action.
- Remove old "First 3 Days" surfaces if they still show alongside new flow.
- Verify "take the tour" re-entry from settings.

**Settings reorganization**
- Groups: Profile / Planner / Appearance / Extra Features / AI Assistant / Data.
- One-line description per setting. Remove or relocate settings that no longer visibly do anything.

**Help content sweep**
- Audit help pages, login-help, tooltips, explainers against final app. Remove references to removed rails / old branding / hidden-without-toggle features.

---

## Batch 2 — Security hardening (§4)

- Run `supabase--linter` first; fix everything actionable.
- Verify RLS on all recently-added tables: `integration_tokens`, `daily_battery_checkins`, `user_feature_preferences`, tasks archive columns, any `member_access`/`provision_events` if present. Users touch only their own rows.
- Dedupe overlapping policies flagged earlier (`error_logs`, `ai_connection_keys`, `user_api_keys`, `admin_users`).
- Tighten `error_logs`: require `user_id` going forward (nullable stays for legacy rows; new inserts must have it).
- Provision/revoke endpoints: verify shared-secret check + rate limit.
- MCP tool handlers: re-audit user scoping on every query (never trust client-supplied user id).
- Auth pages: uniform message for wrong-email vs wrong-password (no enumeration).
- Grep for token/secret leakage in logs, error messages, client bundles.

Migration will go through the approval flow.

---

## Batch 3 — Performance + stability re-verification + launch report (§5, §6)

**Performance (measured, not vibes)**
- Baseline: `bun run build`, record initial JS bundle size (main chunk + eager deps).
- Route-level lazy loading for Extra Features: AI copywriting, arcade, courses, mastermind, wizards beyond chooser, editorial calendar heavy views.
- Lazy-load heavy libs: pdf generation (`jspdf`/pptx/etc.), charts (`recharts`), confetti (`canvas-confetti`) — dynamic import at point of use.
- Global providers audit: unmount/disable data-fetching for disabled features. `useArcade` global mount → gate behind toggle.
- Hot queries: replace `select('*')` with explicit columns on `tasks`, `daily_plans`, `user_settings`.
- Realtime channels: verify unsubscribe on unmount.
- React Query staleTimes: settings (5min), cycle (5min), profile (10min).
- After: re-build, record new bundle size. Report delta.

**Stability re-verification (test, not assume)**
- Sign-out with pending offline mutations (simulate).
- Task creation with network throttled → verify offline queue.
- Debounced-save flush on unmount for daily plan / brain dump.
- Fresh Start archive + restore round-trip.
- Low Battery Day toggle + restore.
- Battery check-in persistence across reload.
- Single offline indicator (no duplicates).
- Gentle error toasts still in place.
- Rapid navigation while editing → no data loss.

**Launch-readiness report** written to `.lovable/plan.md`:
- What passed, what was fixed per section.
- Bundle size before/after with numbers.
- Supabase advisor results (before + after).
- Remaining items requiring the human owner, with exact steps (e.g. "enable HIBP in Cloud → Users → Auth Settings", "verify custom domain DNS", etc.).
- Typecheck status.

---

## Assumptions

- No feature deletions anywhere in the pass.
- Batches ship sequentially, one per turn, so each gets real depth.
- For §4 dedupe, I'll consolidate overlapping policies into one canonical policy per (table, action, role) — behavior-preserving, not permission-widening.
- For §5, the goal is meaningful bundle reduction on the initial route, not a specific KB target — I'll report actuals.
- The name-source order is: profile.first_name → onboarding-captured name → no name. Email is never used as a fallback.

Reply **"go"** to start Batch 1, or tell me to re-cut.
