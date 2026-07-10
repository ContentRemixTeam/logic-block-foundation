import { toast } from 'sonner';
import type { UndoToken } from '@/hooks/useFreshStart';

/**
 * Shows a sonner toast with an undo button, active for ~20 seconds.
 * If the user hits Undo, we call `onUndo()`; otherwise the toast just fades.
 * Copy stays warm and neutral — no urgency, no scare-quotes.
 */
export function showUndoToast(token: UndoToken, onUndo: () => Promise<void> | void) {
  if (token.records.length === 0) {
    toast.success(token.summary || 'Nothing to change — you were already clear.');
    return;
  }
  toast.success(token.summary, {
    duration: 20000,
    description: 'Nothing is lost — just tidied. Restore any time from Archive.',
    action: {
      label: 'Undo',
      onClick: async () => {
        try {
          await onUndo();
          toast.success('Undone.');
        } catch (err) {
          console.error('[UndoSnackbar] undo failed', err);
          toast.error("Couldn't undo — try restoring from Archive.");
        }
      },
    },
  });
}
