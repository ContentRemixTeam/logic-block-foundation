/**
 * Core celebration hook.
 *
 * Celebrations are a first-class part of the product — they are ON by default
 * for everyone and are NOT gated by the "Challenges" extra feature toggle.
 *
 * A user can turn them off entirely from Settings ("Celebrations" switch).
 * We also automatically respect `prefers-reduced-motion`: reduced-motion users
 * get a gentle sonner toast affirmation instead of animated confetti, so the
 * warm moment still lands.
 */
import { useCallback } from 'react';
import { toast } from 'sonner';
import { triggerCelebration } from '@/components/celebrations/CelebrationOverlay';
import { useDelightSettings } from '@/hooks/useDelightSettings';
import {
  pickMessage,
  celebrationConfettiType,
  type CelebrationMoment,
} from '@/lib/celebrationMessages';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function useCelebrate() {
  const { settings } = useDelightSettings();
  const enabled = settings.celebrations_enabled;

  return useCallback(
    (moment: CelebrationMoment, opts?: { message?: string }) => {
      if (!enabled) return;

      const message = opts?.message ?? pickMessage(moment);

      if (prefersReducedMotion()) {
        // Warm affirmation, no animation, auto-dismiss.
        toast.success(message, { duration: 2500 });
        return;
      }

      triggerCelebration({
        type: celebrationConfettiType(moment),
        message,
      });
    },
    [enabled],
  );
}
