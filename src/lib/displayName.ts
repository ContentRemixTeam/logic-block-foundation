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
// Shared-inbox / placeholder names that should NEVER be shown as a greeting.
// If a user typed one of these (or an invite auto-captured an email prefix
// like "info@…"), we prefer no name over a wrong one.
const PLACEHOLDER_NAMES = new Set([
  'info', 'hello', 'hi', 'hey', 'team', 'admin', 'contact', 'support',
  'sales', 'help', 'noreply', 'no-reply', 'mail', 'email', 'user', 'me',
  'owner', 'office',
]);

function sanitize(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function pickDisplayName(
  profileFirstName?: string | null,
  metadata?: { first_name?: unknown; full_name?: unknown } | null,
): string | null {
  if (typeof profileFirstName === 'string') {
    const s = sanitize(profileFirstName);
    if (s) return s;
  }

  const meta = metadata ?? {};
  if (typeof meta.first_name === 'string') {
    const s = sanitize(meta.first_name);
    if (s) return s;
  }

  if (typeof meta.full_name === 'string') {
    const first = meta.full_name.trim().split(/\s+/)[0] ?? '';
    const s = sanitize(first);
    if (s) return s;
  }

  return null;
}
