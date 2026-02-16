import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { isStandalone } from '@/lib/deviceDetection';

const DISMISS_KEY = 'install_banner_dismissed_at';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const dismissedAt = parseInt(dismissed, 10);
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_DAYS;
}

export function InstallBanner() {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(() => !isDismissed());

  if (!isMobile || isStandalone() || !visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Get the app on your home screen</p>
            <p className="text-xs text-muted-foreground">For the best mobile experience</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" asChild>
              <Link to="/install">Install</Link>
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
