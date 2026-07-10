/**
 * Single source of truth for the user's display name.
 *
 * Order of preference:
 *   1. `user_profiles.first_name` (persisted, user-editable)
 *   2. `auth.user.user_metadata.first_name` (captured during signup)
 *   3. `auth.user.user_metadata.full_name` → first word
 *   4. `null` — greet without a name
 *
 * We NEVER derive a name from the email prefix. That produced the
 * "Hi, Info" bug for shared inboxes (info@…, hello@…, team@…).
 */
export function pickDisplayName(
  profileFirstName?: string | null,
  metadata?: { first_name?: unknown; full_name?: unknown } | null,
): string | null {
  const p = typeof profileFirstName === 'string' ? profileFirstName.trim() : '';
  if (p) return p;

  const meta = metadata ?? {};
  const metaFirst = typeof meta.first_name === 'string' ? meta.first_name.trim() : '';
  if (metaFirst) return metaFirst;

  const metaFull = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  if (metaFull) {
    const first = metaFull.split(/\s+/)[0];
    if (first) return first;
  }

  return null;
}
