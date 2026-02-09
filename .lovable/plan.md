

# Security Hardening: Targeted Improvements

## What We're Doing

Applying only the **meaningful** security improvements from the recommendations, while skipping changes that would hurt performance or add no real value.

## What We're NOT Doing (and Why)

| Proposed Fix | Why We're Skipping It |
|---|---|
| Clear all caches on every startup | Destroys performance — every page load would wipe cached data and re-fetch everything. The existing user-change detection already handles cross-user scenarios. |
| Validate session with getUser() on every load | Adds unnecessary latency. Supabase already validates tokens. A user ID mismatch between getSession and getUser can't happen in practice. |
| RLS audit | Already ran it — all tables have RLS enabled with proper policies. No issues found. |

## Changes

### 1. Improve sign-out cache clearing (useAuth.tsx)

- Clear ALL service worker caches on sign-out, not just ones containing "supabase"
- Add `sessionStorage.clear()` to remove any session-specific data
- This is the only real gap in the current implementation

### 2. Add auth event logging (useAuth.tsx)

- Log auth state changes with event type, user ID, and email
- These logs will be visible in development/preview for debugging
- Production already suppresses console.log, so no noise in production

## Technical Details

Both changes are in `src/hooks/useAuth.tsx`:

**Sign-out improvement** — Remove the `.filter(name => name.includes('supabase'))` so all caches are cleared, and add `sessionStorage.clear()`.

**Auth logging** — Add structured logging in the `onAuthStateChange` callback showing event type, previous/new user ID, and email.

