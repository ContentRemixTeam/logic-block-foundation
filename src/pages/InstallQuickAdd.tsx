import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Download, 
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
import { DeviceInstallSteps } from '@/components/install/DeviceInstallSteps';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import type { DeviceType } from '@/lib/deviceDetection';
import { detectDeviceAndBrowser } from '@/lib/deviceDetection';

export default function InstallQuickAdd() {
  const [device, setDevice] = useState<DeviceType>('unknown');
  const { isInstallable, promptInstall } = useInstallPrompt();

  useEffect(() => {
    const info = detectDeviceAndBrowser();
    setDevice(info.device !== 'unknown' ? info.device : 'ios');
  }, []);

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
          {isInstallable && (
            <Card className="mb-8 border-primary">
              <CardContent className="pt-6">
                <Button onClick={promptInstall} size="lg" className="w-full h-14 text-lg">
                  <Download className="h-5 w-5 mr-2" />
                  Install Quick Add
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Device-specific instructions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {device === 'ios' && <Apple className="h-5 w-5" />}
                {device !== 'ios' && <Chrome className="h-5 w-5" />}
                Install on {device === 'ios' ? 'iPhone / iPad' : device === 'android' ? 'Android' : 'Desktop'}
              </CardTitle>
              {device === 'ios' && (
                <CardDescription>
                  <span className="font-medium text-destructive">Important:</span> You must use Safari browser
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <DeviceInstallSteps device={device} appName="Quick Add" showOpenLink />
            </CardContent>
          </Card>

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
