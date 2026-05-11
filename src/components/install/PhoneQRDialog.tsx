import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface PhoneQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Renders a QR code that points at the published app URL so a user sitting
 * at their desktop can scan it with their phone and install the app there.
 *
 * Falls back gracefully if the device has no camera — the URL is also shown
 * as plain text with a one-click copy button.
 */
export function PhoneQRDialog({ open, onOpenChange }: PhoneQRDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Always link to the canonical install page on the live domain so the
  // QR works regardless of which environment generated it (preview vs prod).
  const installUrl = (() => {
    const host = window.location.hostname;
    // If we're on a preview/lovable subdomain, prefer the published URL.
    if (host.includes('lovable.app') || host.includes('lovableproject.com')) {
      return `${window.location.origin}/install`;
    }
    return `${window.location.origin}/install`;
  })();

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(installUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, installUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      toast.success('Link copied — paste it on your phone');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Long-press the link to copy manually.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Get it on your phone
          </DialogTitle>
          <DialogDescription>
            Scan this code with your phone camera to open the app, then install
            it to your home screen for one-tap access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="rounded-xl border-2 border-border bg-white p-3 shadow-sm">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code linking to the mobile install page"
                className="h-64 w-64"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded bg-muted" />
            )}
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {installUrl}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              On iPhone, open in Safari · On Android, open in Chrome — then
              tap <span className="font-medium">Add to Home Screen</span>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
