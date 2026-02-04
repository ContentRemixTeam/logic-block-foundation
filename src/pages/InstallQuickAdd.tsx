import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Download, 
  Share, 
  PlusSquare, 
  MoreVertical,
  Check,
  ArrowLeft,
  Chrome,
  Apple,
  Smartphone,
  CheckSquare,
  Lightbulb,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ManifestSwitcher } from '@/components/pwa/ManifestSwitcher';

type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) return 'desktop';
  return 'unknown';
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

export default function InstallQuickAdd() {
  const [device, setDevice] = useState<DeviceType>('unknown');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setDevice(detectDevice());

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
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <>
      <ManifestSwitcher />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/install" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>All Apps</span>
            </Link>
            <Badge variant="secondary" className="gap-1">
              <Smartphone className="h-3 w-3" />
              {device === 'ios' ? 'iPhone' : device === 'android' ? 'Android' : 'Desktop'}
            </Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground mb-4 shadow-lg">
              <Zap className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Quick Add</h1>
            <p className="text-muted-foreground">
              Capture tasks, ideas, and finances in 3 seconds
            </p>
          </div>

          {/* Progress indicator */}
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">2</div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Step 1 of 2</p>
                  <p className="text-xs text-muted-foreground">After this, install the full Boss Planner app</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">What You Can Capture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">Tasks</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Ideas</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Expenses</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Income</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Why Install Quick Add?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  'Instant launch from your home screen',
                  'Minimal interface - no distractions',
                  'Switch between task/idea/expense/income with one tap',
                  'Syncs to your Boss Planner account',
                  'Works offline - captures sync when online',
                  'Session counter tracks your productivity',
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
                  Install Quick Add
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
                  <span className="font-medium text-destructive">Important:</span> You must use Safari browser
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <InstallStep 
                  number={1}
                  title="Open this page in Safari"
                  description="Make sure you're viewing this page (or /quick-add) in Safari."
                  icon={<Apple className="h-6 w-6" />}
                />
                <InstallStep 
                  number={2}
                  title="Tap the Share button"
                  description="Look for the square with an upward arrow at the bottom."
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
                  description='Quick Add will appear on your home screen!'
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
              </CardHeader>
              <CardContent className="space-y-6">
                <InstallStep 
                  number={1}
                  title="Open in Chrome"
                  description="Make sure you're viewing this page in Chrome."
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
          )}

          {device === 'desktop' && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  Install on Desktop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <InstallStep 
                  number={1}
                  title="Look for the install icon"
                  description="Check the right side of your address bar for a monitor/download icon."
                  icon={<Download className="h-6 w-6" />}
                />
                <InstallStep 
                  number={2}
                  title="Click install"
                  description='Click the icon, then "Install" in the popup.'
                  icon={<PlusSquare className="h-6 w-6" />}
                />
                <InstallStep 
                  number={3}
                  title="Launch from desktop"
                  description="Find Quick Add in your Start menu or Applications folder."
                  icon={<Check className="h-6 w-6" />}
                />
              </CardContent>
            </Card>
          )}

          {/* Next Step */}
          <Card className="mb-6 border-2 border-dashed">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                After installing Quick Add, install the full planning app:
              </p>
              <Button asChild size="lg" className="w-full">
                <Link to="/install">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Step 2: Install Boss Planner →
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" asChild className="flex-1">
              <Link to="/quick-add">
                <Zap className="h-4 w-4 mr-2" />
                Try Quick Add First
              </Link>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
