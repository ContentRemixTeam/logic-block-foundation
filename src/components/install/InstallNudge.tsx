import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Smartphone, X, QrCode } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { isStandalone, detectDeviceAndBrowser } from '@/lib/deviceDetection';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { PhoneQRDialog } from './PhoneQRDialog';

const DISMISS_KEY = 'install_nudge_dismissed_at';
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 8000;

// Routes where the nudge should never appear (auth, install flow itself, etc.)
const HIDDEN_ROUTES = ['/auth', '/install', '/install-quick-add', '/install-success', '/login-help', '/~oauth'];

function isDismissed(): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_DAYS;
  } catch {
    return false;
  }
}

/**
 * Global, low-friction prompt encouraging users to install the app.
 *
 *  - Mobile (not yet installed): a slim bottom card with a one-tap install.
 *      On Android Chrome it triggers the native prompt; on iOS Safari it
 *      links to /install with step-by-step Add-to-Home-Screen instructions.
 *  - Desktop: a small floating "Get it on your phone" pill that opens a QR
 *      code modal, so users can scan with their phone in a few seconds.
 *
 * Dismissible for 7 days. Re-appears automatically afterward.
 */
export function InstallNudge() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (isDismissed()) return;
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;
  if (isStandalone()) return null;
  if (!visible) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* ignore quota errors */
    }
    setVisible(false);
  };

  const handleNativeInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) handleDismiss();
  };

  // --- Mobile variant -------------------------------------------------------
  if (isMobile) {
    const { device } = detectDeviceAndBrowser();
    return (
      <div className="fixed inset-x-3 bottom-3 z-[90] animate-in slide-in-from-bottom-4 fade-in duration-300 sm:left-auto sm:right-4 sm:w-[360px]">
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-card p-3 shadow-lg backdrop-blur">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">
              Add to your home screen
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {device === 'ios'
                ? 'Tap Share, then "Add to Home Screen" — opens like a real app.'
                : 'One tap to install — no app store needed.'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {isInstallable ? (
                <Button size="sm" onClick={handleNativeInstall} className="h-8 px-3 text-xs">
                  Install
                </Button>
              ) : (
                <Button size="sm" asChild className="h-8 px-3 text-xs">
                  <Link to="/install" onClick={handleDismiss}>
                    Show me how
                  </Link>
                </Button>
              )}
              <button
                onClick={handleDismiss}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- Desktop variant ------------------------------------------------------
  return (
    <>
      <div className="fixed bottom-4 right-4 z-[90] animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 py-2 pl-3 pr-2 shadow-lg backdrop-blur">
          <QrCode className="h-4 w-4 text-primary" />
          <button
            onClick={() => setQrOpen(true)}
            className="text-xs font-medium hover:underline"
          >
            Get it on your phone
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <PhoneQRDialog open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}
