import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Smartphone,
  Download,
  Check,
  ArrowLeft,
  Copy,
  PartyPopper,
  ChevronRight,
  Share,
  PlusSquare,
  ShieldCheck,
  Chrome,
  Apple,
} from 'lucide-react';
import { ManifestSwitcher } from '@/components/pwa/ManifestSwitcher';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import {
  detectDeviceAndBrowser,
  isStandalone,
  DeviceInfo,
  getCurrentUrl,
} from '@/lib/deviceDetection';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Flow = 'ios-safari' | 'ios-other' | 'android-chrome' | 'android-other' | 'desktop-supported' | 'desktop-other';

function pickFlow(info: DeviceInfo): Flow {
  if (info.device === 'ios') return info.browser === 'safari' ? 'ios-safari' : 'ios-other';
  if (info.device === 'android') {
    return ['chrome', 'samsung', 'edge'].includes(info.browser) ? 'android-chrome' : 'android-other';
  }
  if (info.device === 'desktop') {
    return info.browser === 'chrome' || info.browser === 'edge' ? 'desktop-supported' : 'desktop-other';
  }
  return 'desktop-other';
}

function VisualStep({ n, title, children, glyph }: { n: number; title: string; children: React.ReactNode; glyph?: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-sm">
        {n}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-[15px] leading-tight">{title}</h3>
          {glyph}
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function GlyphBadge({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground">
      {children}
      {label && <span>{label}</span>}
    </span>
  );
}

export default function Install() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isInstallable, promptInstall } = useInstallPrompt();
  const { toast } = useToast();

  useEffect(() => {
    setDeviceInfo(detectDeviceAndBrowser());
    if (isStandalone()) setInstalled(true);
  }, []);

  const flow = useMemo<Flow | null>(() => (deviceInfo ? pickFlow(deviceInfo) : null), [deviceInfo]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentUrl());
    } catch {
      const ta = document.createElement('textarea');
      ta.value = getCurrentUrl();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: 'Link copied' });
  };

  const oneTap = async () => {
    const ok = await promptInstall();
    if (ok) {
      setInstalled(true);
      toast({ title: "You're all set", description: 'The planner is on your home screen.' });
    }
  };

  if (!deviceInfo || !flow) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (installed) {
    return (
      <>
        <ManifestSwitcher />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <PartyPopper className="h-8 w-8 text-success" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">You're all set</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  The planner is on your home screen. Open it anytime, like a real app.
                </p>
              </div>
              <Button asChild className="w-full min-h-[48px]">
                <Link to="/dashboard">
                  Go to today
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <ManifestSwitcher />
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[44px]">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
          {/* Hero */}
          <div className="text-center pt-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-3 shadow-sm">
              <Smartphone className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Get the app on your phone</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              A one-time setup. Opens like a real app after.
            </p>
          </div>

          {/* Per-flow card */}
          {flow === 'android-chrome' && isInstallable && (
            <Card className="border-primary/30">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="inline-flex items-center gap-2 bg-success/10 text-success px-3 py-1 rounded-full text-xs font-medium">
                  <Check className="h-3.5 w-3.5" />
                  Ready to install
                </div>
                <p className="text-sm text-muted-foreground">
                  One tap and the planner lands on your home screen.
                </p>
                <Button onClick={oneTap} size="lg" className="w-full min-h-[52px] text-base">
                  <Download className="h-5 w-5 mr-2" />
                  Install app
                </Button>
              </CardContent>
            </Card>
          )}

          {flow === 'android-chrome' && !isInstallable && (
            <Card>
              <CardContent className="pt-6 pb-6 space-y-5">
                <p className="text-sm text-muted-foreground">
                  Your browser will offer to install shortly. If nothing pops up, use the menu:
                </p>
                <div className="space-y-4">
                  <VisualStep n={1} title="Tap the ⋮ menu" glyph={<GlyphBadge>⋮</GlyphBadge>}>
                    Top-right corner of Chrome.
                  </VisualStep>
                  <VisualStep n={2} title={'Choose "Install app"'} glyph={<GlyphBadge><PlusSquare className="h-3.5 w-3.5" /></GlyphBadge>}>
                    Or "Add to Home screen" — either works.
                  </VisualStep>
                  <VisualStep n={3} title="Confirm">
                    The planner appears on your home screen. Done.
                  </VisualStep>
                </div>
              </CardContent>
            </Card>
          )}

          {flow === 'desktop-supported' && (
            <Card className="border-primary/30">
              <CardContent className="pt-6 pb-6 space-y-4">
                {isInstallable ? (
                  <>
                    <div className="inline-flex items-center gap-2 bg-success/10 text-success px-3 py-1 rounded-full text-xs font-medium">
                      <Check className="h-3.5 w-3.5" />
                      Ready to install
                    </div>
                    <p className="text-sm text-muted-foreground">Install as a standalone window.</p>
                    <Button onClick={oneTap} size="lg" className="w-full min-h-[52px] text-base">
                      <Download className="h-5 w-5 mr-2" />
                      Install app
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <VisualStep n={1} title="Look at the address bar" glyph={<GlyphBadge><Download className="h-3.5 w-3.5" /></GlyphBadge>}>
                      A small install icon appears on the right side.
                    </VisualStep>
                    <VisualStep n={2} title={'Click "Install"'}>
                      The planner opens as its own window and appears in your apps.
                    </VisualStep>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {flow === 'ios-safari' && (
            <Card>
              <CardContent className="pt-6 pb-6 space-y-5">
                <div className="flex items-center gap-2 text-sm">
                  <Apple className="h-4 w-4" />
                  <span className="text-muted-foreground">You're in Safari — perfect.</span>
                </div>
                <div className="space-y-5">
                  <VisualStep
                    n={1}
                    title="Tap the Share button"
                    glyph={<GlyphBadge><Share className="h-3.5 w-3.5" /></GlyphBadge>}
                  >
                    It's the square icon with an up-arrow at the <strong>bottom</strong> of Safari on iPhone (or the top on iPad).
                  </VisualStep>
                  <VisualStep
                    n={2}
                    title={'Choose "Add to Home Screen"'}
                    glyph={<GlyphBadge><PlusSquare className="h-3.5 w-3.5" /> Add</GlyphBadge>}
                  >
                    You may need to scroll the share sheet a little to find it.
                  </VisualStep>
                  <VisualStep n={3} title={'Tap "Add" in the top right'}>
                    The planner icon appears on your home screen. Open it anytime, like a real app.
                  </VisualStep>
                </div>
              </CardContent>
            </Card>
          )}

          {flow === 'ios-other' && (
            <Card>
              <CardContent className="pt-6 pb-6 space-y-4">
                <p className="text-sm">
                  On iPhone, only <strong>Safari</strong> can install home-screen apps. Copy this link, then paste it in Safari.
                </p>
                <Button onClick={copy} size="lg" className={cn('w-full min-h-[52px] text-base', copied && 'bg-success text-success-foreground hover:bg-success/90')}>
                  {copied ? <><Check className="h-5 w-5 mr-2" />Copied — open Safari now</> : <><Copy className="h-5 w-5 mr-2" />Copy link</>}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Open Safari → tap the address bar → paste → go. Then come back to this page and follow the steps.
                </p>
              </CardContent>
            </Card>
          )}

          {flow === 'android-other' && (
            <Card>
              <CardContent className="pt-6 pb-6 space-y-4">
                <p className="text-sm">
                  On Android, <strong>Chrome</strong> gives the smoothest install. Copy this link, then paste it in Chrome.
                </p>
                <Button onClick={copy} size="lg" className={cn('w-full min-h-[52px] text-base', copied && 'bg-success text-success-foreground hover:bg-success/90')}>
                  {copied ? <><Check className="h-5 w-5 mr-2" />Copied — open Chrome now</> : <><Copy className="h-5 w-5 mr-2" />Copy link</>}
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Chrome className="h-3.5 w-3.5" /> Open Chrome → paste → tap Enter.
                </div>
              </CardContent>
            </Card>
          )}

          {flow === 'desktop-other' && (
            <Card>
              <CardContent className="pt-6 pb-6 space-y-3 text-sm">
                <p>
                  Your current browser doesn't support installing web apps. Open this page in <strong>Chrome</strong> or <strong>Edge</strong> to install.
                </p>
                <Button onClick={copy} variant="outline" className="w-full">
                  {copied ? <><Check className="h-4 w-4 mr-2" />Copied</> : <><Copy className="h-4 w-4 mr-2" />Copy link</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Calm reassurance replaces the old scary storage popup */}
          <div className="flex gap-3 items-start rounded-lg border border-border bg-muted/40 p-3">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Installing the app keeps your work extra safe on this device — the planner remembers your drafts even if your connection blips. Nothing to configure.
            </p>
          </div>

          <div className="pb-8">
            <Button variant="ghost" asChild className="w-full text-muted-foreground">
              <Link to="/dashboard">Skip — I'll keep using the browser</Link>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
