import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Zap, 
  Smartphone, 
  ChevronRight,
  PartyPopper,
  Lightbulb,
} from 'lucide-react';
import { ManifestSwitcher } from '@/components/pwa/ManifestSwitcher';

interface InstalledApp {
  name: string;
  installed: boolean;
}

export default function InstallSuccess() {
  const location = useLocation();
  const state = location.state as { apps?: InstalledApp[] } | null;
  
  const apps: InstalledApp[] = state?.apps ?? [
    { name: 'Quick Add', installed: true },
    { name: 'Boss Planner', installed: true },
  ];
  
  const allInstalled = apps.every(app => app.installed);

  return (
    <>
      <ManifestSwitcher />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-bounce">
              <PartyPopper className="h-10 w-10 text-success" />
            </div>
            <CardTitle className="text-2xl">
              {allInstalled ? "You're All Set! 🎉" : "Almost There!"}
            </CardTitle>
            <CardDescription className="text-base">
              {allInstalled 
                ? "Both apps are now installed on your device"
                : "Some apps are ready to use"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* App icons */}
            <div className="flex justify-center gap-6">
              {apps.map((app) => (
                <div key={app.name} className="text-center">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg ${
                    app.name === 'Quick Add' 
                      ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {app.name === 'Quick Add' ? <Zap className="h-8 w-8" /> : <Smartphone className="h-8 w-8" />}
                  </div>
                  <p className="text-sm font-medium">{app.name}</p>
                  <p className={`text-xs ${app.installed ? 'text-success' : 'text-muted-foreground'}`}>
                    {app.installed ? '✓ Installed' : '○ Not installed'}
                  </p>
                </div>
              ))}
            </div>

            {allInstalled && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                <p className="text-sm">
                  🎉 Find both apps on your home screen. They're ready to use!
                </p>
              </div>
            )}

            {/* Tips */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  Getting Started Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Use <strong>Quick Add</strong> when ideas strike - it opens instantly</p>
                <p>• Open <strong>Boss Planner</strong> each morning to plan your day</p>
                <p>• Everything syncs automatically between apps</p>
                <p>• Both apps work offline - changes sync when you're back online</p>
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
