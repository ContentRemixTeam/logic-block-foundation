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
            Get instant access to Quick Capture right from your home screen
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
              <CardDescription>Follow these steps in Safari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <InstallStep 
                number={1}
                title="Tap the Share button"
                description="Look for the share icon at the bottom of Safari"
                icon={<Share className="h-6 w-6" />}
              />
              <InstallStep 
                number={2}
                title='Scroll down and tap "Add to Home Screen"'
                description="You may need to scroll to find this option"
                icon={<PlusSquare className="h-6 w-6" />}
              />
              <InstallStep 
                number={3}
                title='Tap "Add" in the top right'
                description="Boss Planner will appear on your home screen"
                icon={<Check className="h-6 w-6" />}
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
              <CardDescription>Follow these steps in Chrome</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <InstallStep 
                number={1}
                title="Tap the menu button"
                description="Look for the three dots in the top right corner"
                icon={<MoreVertical className="h-6 w-6" />}
              />
              <InstallStep 
                number={2}
                title='Tap "Add to Home screen" or "Install app"'
                description="This option may appear as a banner at the bottom"
                icon={<PlusSquare className="h-6 w-6" />}
              />
              <InstallStep 
                number={3}
                title='Tap "Add" or "Install"'
                description="Boss Planner will appear on your home screen"
                icon={<Check className="h-6 w-6" />}
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
              <CardDescription>Works in Chrome, Edge, and other modern browsers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <InstallStep 
                number={1}
                title="Look for the install icon in the address bar"
                description="It looks like a computer with a down arrow, or a plus sign"
                icon={<Download className="h-6 w-6" />}
              />
              <InstallStep 
                number={2}
                title='Click "Install"'
                description="Boss Planner will install as a desktop app"
                icon={<Check className="h-6 w-6" />}
              />
            </CardContent>
          </Card>
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
