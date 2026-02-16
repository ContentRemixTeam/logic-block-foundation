import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Download, 
  Check,
  Zap,
  ArrowLeft,
  Chrome,
  Apple,
  ChevronRight,
  PartyPopper,
} from 'lucide-react';
import { ManifestSwitcher } from '@/components/pwa/ManifestSwitcher';
import { BrowserWarning } from '@/components/install/BrowserWarning';
import { InstallTroubleshooting } from '@/components/install/InstallTroubleshooting';
import { DeviceSelector } from '@/components/install/DeviceSelector';
import { AppCard } from '@/components/install/AppCard';
import { DeviceInstallSteps } from '@/components/install/DeviceInstallSteps';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { 
  detectDeviceAndBrowser, 
  isStandalone, 
  DeviceInfo, 
  DeviceType,
  getDeviceName,
} from '@/lib/deviceDetection';
import { cn } from '@/lib/utils';

type InstallStepType = 'intro' | 'quick-add' | 'boss-planner' | 'success';

export default function Install() {
  const navigate = useNavigate();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('unknown');
  const [currentStep, setCurrentStep] = useState<InstallStepType>('intro');
  const [quickAddInstalled, setQuickAddInstalled] = useState(false);
  const [bossPlannerInstalled, setBossPlannerInstalled] = useState(false);
  const { isInstallable, promptInstall } = useInstallPrompt();

  useEffect(() => {
    const info = detectDeviceAndBrowser();
    setDeviceInfo(info);
    setSelectedDevice(info.device !== 'unknown' ? info.device : 'ios');
    
    // Check if already installed
    if (isStandalone()) {
      setBossPlannerInstalled(true);
    }
  }, []);

  const handleInstallClick = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setBossPlannerInstalled(true);
      if (quickAddInstalled) {
        setCurrentStep('success');
      }
    }
  };

  const markQuickAddInstalled = () => {
    setQuickAddInstalled(true);
    setCurrentStep('boss-planner');
  };

  const markBossPlannerInstalled = () => {
    setBossPlannerInstalled(true);
    setCurrentStep('success');
  };

  // Recalculate device info when user manually selects a device
  const getDisplayDeviceInfo = (): DeviceInfo => {
    if (!deviceInfo) {
      return {
        device: selectedDevice,
        browser: 'other',
        canInstall: true,
        installMessage: '',
      };
    }
    
    // If user selected their detected device, use actual info
    if (selectedDevice === deviceInfo.device) {
      return deviceInfo;
    }
    
    // Otherwise show instructions for selected device
    return {
      device: selectedDevice,
      browser: deviceInfo.browser,
      canInstall: true, // Allow viewing instructions for any device
      installMessage: '',
    };
  };

  const displayInfo = getDisplayDeviceInfo();

  if (!deviceInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Success state - both apps installed
  if (currentStep === 'success' || (quickAddInstalled && bossPlannerInstalled)) {
    return (
      <>
        <ManifestSwitcher />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <PartyPopper className="h-10 w-10 text-success" />
              </div>
              <CardTitle className="text-2xl">You're All Set! 🎉</CardTitle>
              <CardDescription className="text-base">
                Both apps are now installed on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* App icons */}
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center mx-auto mb-2">
                    <Zap className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">Quick Add</p>
                  <p className="text-xs text-success">✓ Installed</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">Boss Planner</p>
                  <p className="text-xs text-success">✓ Installed</p>
                </div>
              </div>

              {/* Tips */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">💡 Getting Started Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>• Use <strong>Quick Add</strong> when you need to capture something fast</p>
                  <p>• Open <strong>Boss Planner</strong> each morning to plan your day</p>
                  <p>• Both apps sync automatically to your account</p>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-3">
                <Button asChild className="w-full" size="lg">
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="flex-1">
                    <Link to="/quick-add">
                      <Zap className="h-4 w-4 mr-2" />
                      Try Quick Add
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1">
                    <Link to="/today">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Plan Today
                    </Link>
                  </Button>
                </div>
              </div>
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
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <Badge variant="secondary" className="gap-1">
              <Smartphone className="h-3 w-3" />
              {getDeviceName(deviceInfo.device)}
            </Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Browser Warning */}
          {deviceInfo.device === selectedDevice && (
            <BrowserWarning deviceInfo={deviceInfo} />
          )}

          {/* Hero */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Install Boss Planner</h1>
            <p className="text-muted-foreground">
              You'll install <strong>two apps</strong> on your phone for the complete experience
            </p>
          </div>

          {/* App Preview */}
          <Card className="mb-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex justify-center gap-8 mb-4">
                <div className="text-center">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-2 transition-all",
                    quickAddInstalled 
                      ? "bg-success text-success-foreground" 
                      : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                  )}>
                    {quickAddInstalled ? <Check className="h-7 w-7" /> : <Zap className="h-7 w-7" />}
                  </div>
                  <p className="text-sm font-medium">Quick Add</p>
                  <p className="text-xs text-muted-foreground">Fast capture</p>
                </div>
                <div className="flex items-center text-muted-foreground">+</div>
                <div className="text-center">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-2 transition-all",
                    bossPlannerInstalled 
                      ? "bg-success text-success-foreground" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {bossPlannerInstalled ? <Check className="h-7 w-7" /> : <Smartphone className="h-7 w-7" />}
                  </div>
                  <p className="text-sm font-medium">Boss Planner</p>
                  <p className="text-xs text-muted-foreground">Full planning</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step Progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              currentStep === 'intro' || currentStep === 'quick-add'
                ? "bg-primary text-primary-foreground"
                : quickAddInstalled 
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
            )}>
              {quickAddInstalled ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div className="w-12 h-0.5 bg-muted" />
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              currentStep === 'boss-planner'
                ? "bg-primary text-primary-foreground"
                : bossPlannerInstalled 
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
            )}>
              {bossPlannerInstalled ? <Check className="h-4 w-4" /> : "2"}
            </div>
          </div>

          {/* Device Selector (only show on intro) */}
          {currentStep === 'intro' && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <DeviceSelector 
                  selectedDevice={selectedDevice}
                  onSelectDevice={setSelectedDevice}
                  detectedDevice={deviceInfo.device}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 1: Quick Add */}
          {(currentStep === 'intro' || currentStep === 'quick-add') && !quickAddInstalled && (
            <div className="space-y-4 mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                First, install Quick Add
              </h2>
              
              <AppCard
                title="Quick Add"
                description="Lightning-fast capture. Opens in 1 second."
                icon={<Zap className="h-7 w-7" />}
                iconGradient
                badge="Install First"
                isActive={currentStep === 'quick-add' || currentStep === 'intro'}
                features={[
                  'Capture tasks, ideas, expenses, income',
                  'Instant launch from home screen',
                  'Minimal interface - no distractions',
                  'Works offline - syncs when online',
                ]}
              >
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => setCurrentStep('quick-add')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Install Quick Add
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </AppCard>

              {currentStep === 'quick-add' && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedDevice === 'ios' && <Apple className="h-5 w-5" />}
                      {selectedDevice === 'android' && <Chrome className="h-5 w-5" />}
                      {selectedDevice === 'desktop' && <Chrome className="h-5 w-5" />}
                      Install Quick Add on {getDeviceName(selectedDevice)}
                    </CardTitle>
                    {selectedDevice === 'ios' && (
                      <CardDescription>
                        <span className="font-medium text-destructive">⚠️ Important:</span> You MUST use Safari browser
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <DeviceInstallSteps device={selectedDevice} appName="Quick Add" showOpenLink />

                    <div className="pt-4 border-t">
                      <Button 
                        onClick={markQuickAddInstalled}
                        className="w-full"
                        size="lg"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        I've Installed Quick Add - Continue
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Can't install right now? <button onClick={() => setCurrentStep('boss-planner')} className="underline">Skip to Boss Planner</button>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Quick Add Complete */}
          {quickAddInstalled && (
            <Card className="mb-6 border-success/50 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Quick Add installed!</p>
                    <p className="text-sm text-muted-foreground">Now let's install Boss Planner</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Boss Planner */}
          {(currentStep === 'boss-planner' || (currentStep === 'intro' && quickAddInstalled)) && !bossPlannerInstalled && (
            <div className="space-y-4 mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                Next, install Boss Planner
              </h2>
              
              <AppCard
                title="Boss Planner"
                description="Your complete planning hub for today, this week, and beyond."
                icon={<Smartphone className="h-7 w-7" />}
                isActive
                features={[
                  'Plan your day with Top 3 priorities',
                  'Weekly planning & reflection',
                  '90-day goal tracking',
                  'Full dashboard & analytics',
                ]}
              >
                {isInstallable ? (
                  <Button onClick={handleInstallClick} size="lg" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Install Boss Planner
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2 px-4 bg-muted rounded-lg">
                    ↓ Follow the instructions below to install
                  </p>
                )}
              </AppCard>

              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedDevice === 'ios' && <Apple className="h-5 w-5" />}
                    {selectedDevice === 'android' && <Chrome className="h-5 w-5" />}
                    {selectedDevice === 'desktop' && <Chrome className="h-5 w-5" />}
                    Install Boss Planner on {getDeviceName(selectedDevice)}
                  </CardTitle>
                  {selectedDevice === 'ios' && (
                    <CardDescription>
                      <span className="font-medium text-destructive">⚠️ Important:</span> You MUST use Safari browser
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                    <DeviceInstallSteps device={selectedDevice} appName="Boss Planner" />

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={markBossPlannerInstalled}
                      className="w-full"
                      size="lg"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      I've Installed Boss Planner - Done!
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* How They Work Together */}
          {currentStep === 'intro' && (
            <Card className="mb-6 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>📱</span> Why Two Apps?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Quick Add</p>
                    <p className="text-sm text-muted-foreground">
                      Opens instantly. Capture a task or idea without breaking your flow.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Boss Planner</p>
                    <p className="text-sm text-muted-foreground">
                      Your full planning hub. Organize your day, week, and 90-day goals.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Troubleshooting */}
          <div className="mb-6">
            <InstallTroubleshooting />
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" asChild className="flex-1">
              <Link to="/dashboard">
                Maybe Later
              </Link>
            </Button>
            <Button asChild className="flex-1">
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
