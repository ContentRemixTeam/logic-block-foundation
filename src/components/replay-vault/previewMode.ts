/**
 * Preview mode switch for the hidden Mastermind QA accounts.
 *
 * By default every Vault/curriculum request asks the server for admin preview
 * (`preview: true`). The server only honours that for admins and allowlisted
 * subjects, so members are unaffected. For QA it means Faith's accounts can never
 * observe the real member path (publication switch, launch state, scope checks).
 *
 * Append `?preview=0` to any Mastermind URL to turn preview off for the tab, and
 * `?preview=1` to turn it back on. The choice is remembered in sessionStorage so
 * it survives in-app navigation but not a new tab.
 */
const STORAGE_KEY = 'mastermind.preview';

export function vaultPreviewEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const param = new URLSearchParams(window.location.search).get('preview');
    if (param === '0' || param === 'off' || param === 'false') {
      window.sessionStorage.setItem(STORAGE_KEY, 'off');
      return false;
    }
    if (param === '1' || param === 'on' || param === 'true') {
      window.sessionStorage.setItem(STORAGE_KEY, 'on');
      return true;
    }
    return window.sessionStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}
