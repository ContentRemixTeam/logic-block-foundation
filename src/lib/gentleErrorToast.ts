/**
 * Gentle, calm user-facing error toasts for silent-catch sites.
 * Debounced so repeated failures don't spam the user.
 */
import { toast } from 'sonner';

const lastShown: Record<string, number> = {};
const DEBOUNCE_MS = 60_000;

export function gentleSaveWarning(
  key: string,
  message = "We couldn't save that just now — your work is kept safely on this device and we'll retry.",
) {
  const now = Date.now();
  if (lastShown[key] && now - lastShown[key] < DEBOUNCE_MS) return;
  lastShown[key] = now;
  try {
    toast.message('Saved on this device', { description: message, duration: 5000 });
  } catch {
    // toast system unavailable — nothing else to do
  }
}

export function gentleLoadWarning(
  key: string,
  message = "We couldn't load that just now. Please try again in a moment.",
) {
  const now = Date.now();
  if (lastShown[key] && now - lastShown[key] < DEBOUNCE_MS) return;
  lastShown[key] = now;
  try {
    toast.message('Hmm, that didn\'t load', { description: message, duration: 5000 });
  } catch {
    // ignore
  }
}
