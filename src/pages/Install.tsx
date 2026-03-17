import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Download, 
  Check,
  ArrowLeft,
  Copy,
  ExternalLink,
  PartyPopper,
  ChevronRight,
  TabletSmartphone,
} from 'lucide-react';
import { ManifestSwitcher } from '@/components/pwa/ManifestSwitcher';
import { DeviceSelector } from '@/components/install/DeviceSelector';
import { DeviceInstallSteps } from '@/components/install/DeviceInstallSteps';
import { InstallTroubleshooting } from '@/components/install/InstallTroubleshooting';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { 
  detectDeviceAndBrowser, 
  isStandalone, 
  DeviceInfo, 
  DeviceType,
  getDeviceName,
  getCurrentUrl,
} from '@/lib/deviceDetection';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function Install() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('unknown');
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isInstallable, promptInstall } = useInstallPrompt();
  const { toast } = useToast();

  useEffect(() => {
    const info = detectDeviceAndBrowser();
    setDeviceInfo(info);
    setSelectedDevice(info.device !== 'unknown' ? info.device : 'ios');
    if (isStandalone()) {
      setAlreadyInstalled(true);
    }
  }, []);

  const handleInstallClick = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setAlreadyInstalled(true);
      toast({ title: "App installed! 🎉", description: "Find it on your home screen." });
    }
  };

  const handleCopyUrl = async () => {
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
    toast({ title: "Link copied!", description: "Paste it in Safari to install." });
  };

  const needsSafari = selectedDevice === 'ios' && deviceInfo?.browser !== 'safari';
  const needsChrome = selectedDevice === 'android' && deviceInfo?.browser !== 'chrome' && deviceInfo?.browser !== 'samsung' && deviceInfo?.browser !== 'edge';
  const showBrowserWarning = (needsSafari || needsChrome) && selectedDevice === deviceInfo?.device;

  if (!deviceInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Already installed state
  if (alreadyInstalled) {
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
                Boss Planner is installed on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p>• Open the app from your <strong>home screen</strong></p>
                <p>• It syncs automatically to your account</p>
                <p>• Updates happen in the background</p>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ChevronRight className="h-4 w-4 ml-2" />
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
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <Badge variant="secondary" className="gap-1.5 py-1">
              <TabletSmartphone className="h-3.5 w-3.5" />
              {getDeviceName(deviceInfo.device)}
            </Badge>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-lg">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg">
              <Smartphone className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Install Boss Planner</h1>
            <p className="text-muted-foreground">
              Add it to your home screen for the best experience
            </p>
          </div>

          {/* Native install button (Chrome/Edge on Android/Desktop) */}
          {isInstallable && (
            <Card className="mb-6 border-primary bg-primary/5">
              <CardContent className="pt-6 pb-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full text-sm font-medium">
                    <Check className="h-4 w-4" />
                    Ready to install
                  </div>
                  <p className="text-sm text-muted-foreground">Your browser supports one-tap install</p>
                  <Button onClick={handleInstallClick} size="lg" className="w-full text-base min-h-[52px]">
                    <Download className="h-5 w-5 mr-2" />
                    Install App
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Browser warning */}
          {showBrowserWarning && (
            <Card className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6 pb-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="font-semibold text-base">
                        {needsSafari ? "Open in Safari to install" : "Open in Chrome to install"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {needsSafari 
                          ? "iPhone and iPad only allow installing apps from Safari. Copy the link below and paste it in Safari."
                          : "Chrome works best for installing on Android. Copy the link and open it in Chrome."
                        }
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCopyUrl}
                    variant="outline" 
                    className="w-full min-h-[48px] text-base"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-success" />
                        Copied! Now paste in {needsSafari ? 'Safari' : 'Chrome'}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device selector */}
          <Card className="mb-6">
            <CardContent className="pt-5 pb-5">
              <DeviceSelector 
                selectedDevice={selectedDevice}
                onSelectDevice={setSelectedDevice}
                detectedDevice={deviceInfo.device}
              />
            </CardContent>
          </Card>

          {/* Install instructions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                {selectedDevice === 'ios' ? '🍎' : selectedDevice === 'android' ? '📱' : '💻'}
              </span>
              {selectedDevice === 'ios' ? 'iPhone & iPad' : selectedDevice === 'android' ? 'Android' : 'Desktop'} Instructions
            </h2>
            <DeviceInstallSteps device={selectedDevice} />
          </div>

          {/* Troubleshooting */}
          <div className="mb-8">
            <InstallTroubleshooting />
          </div>

          {/* Footer */}
          <div className="pb-8">
            <Button variant="ghost" asChild className="w-full text-muted-foreground">
              <Link to="/dashboard">
                Skip — I'll use the browser version
              </Link>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
