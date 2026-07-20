import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAccessCheck } from '@/hooks/useAccessCheck';

const DISMISS_KEY = 'lbbp:access_expiry_dismissed_at';

export function AccessExpiryBanner() {
  const { accessLevel, daysUntilExpiry, hasAccess } = useAccessCheck();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (raw) {
      const dismissedAt = parseInt(raw, 10);
      // Re-show once a day
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) setDismissed(true);
    }
  }, []);

  if (
    !hasAccess ||
    accessLevel !== 'annual' ||
    daysUntilExpiry === null ||
    daysUntilExpiry > 14 ||
    daysUntilExpiry < 0 ||
    dismissed
  ) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 text-sm flex items-center justify-between gap-3">
      <span className="text-foreground/80">
        Your annual access renews in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}.
        No rush — you'll get a gentle reminder when it's time.
      </span>
      <button
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-primary/10 text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
