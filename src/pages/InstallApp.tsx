import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Download, 
  Share, 
  PlusSquare, 
  MoreVertical,
  Check,
  Zap,
  ArrowLeft,
  Chrome,
  Apple,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) return 'desktop';
  return 'unknown';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export default function InstallApp() {
  const [device, setDevice] = useState<DeviceType>('unknown');
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setDevice(detectDevice());
    setIsInstalled(isStandalone());

    // Listen for beforeinstallprompt event (Chrome/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <CardTitle>Already Installed!</CardTitle>
            <CardDescription>
              Boss Planner is installed on your device. You can access it from your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link to="/capture">
                <Zap className="h-4 w-4 mr-2" />
                Open Quick Capture
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <Badge variant="secondary" className="gap-1">
            <Smartphone className="h-3 w-3" />
            {device === 'ios' ? 'iPhone' : device === 'android' ? 'Android' : 'Desktop'}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Zap className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Install Boss Planner</h1>
          <p className="text-muted-foreground">
            Get the full mobile-optimized planning experience from your home screen
          </p>
        </div>

        {/* Benefits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                'Launch Quick Capture instantly from your home screen',
                'Mobile-optimized daily planning with tap-to-schedule',
                'Larger touch targets designed for one-handed use',
                'Swipeable day navigation in weekly planner',
                'Auto-scroll to current time in agenda view',
                'Works offline - capture ideas anytime',
                'Full-screen experience without browser UI',
                'Faster loading - cached for speed',
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Chrome/Android prompt button */}
        {deferredPrompt && (
          <Card className="mb-8 border-primary">
            <CardContent className="pt-6">
              <Button onClick={handleInstallClick} size="lg" className="w-full h-14 text-lg">
                <Download className="h-5 w-5 mr-2" />
                Install Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Device-specific instructions */}
        {device === 'ios' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Install on iPhone / iPad
              </CardTitle>
              <CardDescription>
                <span className="font-medium text-destructive">Important:</span> You must use Safari browser for this to work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <InstallStep 
                number={1}
                title="Open this page in Safari"
                description="If you're using Chrome, copy this page's URL and paste it in Safari. The install feature only works in Safari on iOS."
                icon={<Apple className="h-6 w-6" />}
              />
              <InstallStep 
                number={2}
                title="Tap the Share button"
                description="Look at the bottom of your screen for the Share icon — it's a square with an upward arrow. Tap it to open the share menu."
                icon={<Share className="h-6 w-6" />}
              />
              <InstallStep 
                number={3}
                title='Scroll down and tap "Add to Home Screen"'
                description='In the share menu, scroll down the list of options. Look for "Add to Home Screen" with a plus icon. You may need to scroll quite a bit to find it.'
                icon={<PlusSquare className="h-6 w-6" />}
              />
              <InstallStep 
                number={4}
                title='Tap "Add" in the top right corner'
                description='A screen will appear showing the app name and icon. Tap "Add" in the top right corner to confirm. Boss Planner will now appear on your home screen!'
                icon={<Check className="h-6 w-6" />}
              />
              <InstallStep 
                number={5}
                title="Find the app on your home screen"
                description="Go to your home screen — you'll see the Boss Planner icon. Tap it anytime to open the app instantly without opening Safari first."
                icon={<Smartphone className="h-6 w-6" />}
              />
            </CardContent>
          </Card>
        )}

        {device === 'android' && !deferredPrompt && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                Install on Android
              </CardTitle>
              <CardDescription>
                <span className="font-medium">Recommended:</span> Use Chrome browser for the best experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <InstallStep 
                number={1}
                title="Open this page in Chrome"
                description="Make sure you're viewing this page in the Chrome browser. Other browsers may work but Chrome provides the best experience."
                icon={<Chrome className="h-6 w-6" />}
              />
              <InstallStep 
                number={2}
                title="Tap the menu button (⋮)"
                description="Look in the top right corner of Chrome for three vertical dots. Tap them to open the browser menu."
                icon={<MoreVertical className="h-6 w-6" />}
              />
              <InstallStep 
                number={3}
                title='Tap "Add to Home screen" or "Install app"'
                description='In the menu, look for "Add to Home screen" or "Install app". The wording varies by Android version. You might also see an install banner at the bottom of the screen — you can tap that too.'
                icon={<PlusSquare className="h-6 w-6" />}
              />
              <InstallStep 
                number={4}
                title='Confirm by tapping "Add" or "Install"'
                description='A popup will appear asking you to confirm. Tap "Add" or "Install" to complete the installation. Boss Planner will be added to your home screen!'
                icon={<Check className="h-6 w-6" />}
              />
              <InstallStep 
                number={5}
                title="Find the app on your home screen"
                description="Go to your home screen or app drawer — you'll see the Boss Planner icon. Tap it anytime to open the app instantly!"
                icon={<Smartphone className="h-6 w-6" />}
              />
            </CardContent>
          </Card>
        )}

        {device === 'desktop' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                Install on Desktop
              </CardTitle>
              <CardDescription>Works in Chrome, Edge, Brave, and other Chromium-based browsers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <InstallStep 
                number={1}
                title="Look for the install icon in the address bar"
                description="On the right side of your browser's address bar, look for a small icon — it usually looks like a computer monitor with a download arrow, or a plus (+) sign inside a circle."
                icon={<Download className="h-6 w-6" />}
              />
              <InstallStep 
                number={2}
                title="Click the install icon"
                description="Click the icon, then click Install in the popup that appears. If you do not see the icon, click the three-dot menu (⋮) and look for Install Boss Planner or Install app."
                icon={<PlusSquare className="h-6 w-6" />}
              />
              <InstallStep 
                number={3}
                title="Launch from your desktop or start menu"
                description="After installing, Boss Planner will open in its own window. You can find it in your Start menu (Windows), Applications folder (Mac), or pinned to your taskbar/dock."
                icon={<Check className="h-6 w-6" />}
              />
            </CardContent>
          </Card>
        )}

        {/* Show all instructions if device unknown */}
        {device === 'unknown' && (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="h-5 w-5" />
                  iPhone / iPad Instructions
                </CardTitle>
                <CardDescription>
                  <span className="font-medium text-destructive">Important:</span> You must use Safari browser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <InstallStep 
                  number={1}
                  title="Open in Safari"
                  description="Copy this URL and open it in Safari. The install feature only works in Safari on iOS."
                  icon={<Apple className="h-6 w-6" />}
                />
                <InstallStep 
                  number={2}
                  title="Tap the Share button"
                  description="Look for the square with an upward arrow at the bottom of your screen."
                  icon={<Share className="h-6 w-6" />}
                />
                <InstallStep 
                  number={3}
                  title='Tap "Add to Home Screen"'
                  description='Scroll down in the share menu to find this option.'
                  icon={<PlusSquare className="h-6 w-6" />}
                />
                <InstallStep 
                  number={4}
                  title='Tap "Add" to confirm'
                  description='The app will appear on your home screen.'
                  icon={<Check className="h-6 w-6" />}
                />
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  Android Instructions
                </CardTitle>
                <CardDescription>Use Chrome for the best experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <InstallStep 
                  number={1}
                  title="Open in Chrome"
                  description="Make sure you're viewing this page in Chrome browser."
                  icon={<Chrome className="h-6 w-6" />}
                />
                <InstallStep 
                  number={2}
                  title="Tap the menu (⋮)"
                  description="Look for three vertical dots in the top right corner."
                  icon={<MoreVertical className="h-6 w-6" />}
                />
                <InstallStep 
                  number={3}
                  title='Tap "Add to Home screen"'
                  description='Or look for "Install app" in the menu.'
                  icon={<PlusSquare className="h-6 w-6" />}
                />
                <InstallStep 
                  number={4}
                  title="Confirm installation"
                  description='Tap "Add" or "Install" to complete.'
                  icon={<Check className="h-6 w-6" />}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" asChild className="flex-1">
            <Link to="/dashboard">
              Maybe Later
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/capture">
              <Zap className="h-4 w-4 mr-2" />
              Try Quick Capture First
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function InstallStep({ 
  number, 
  title, 
  description, 
  icon 
}: { 
  number: number; 
  title: string; 
  description: string; 
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="font-medium">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
