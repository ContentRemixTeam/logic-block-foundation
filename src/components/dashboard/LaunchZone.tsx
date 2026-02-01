import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LaunchZoneProps {
  children?: ReactNode;
  launchName?: string;
  hasLaunch: boolean;
  className?: string;
}

export function LaunchZone({ children, launchName, hasLaunch, className }: LaunchZoneProps) {
  if (!hasLaunch) {
    return (
      <Card className={cn(
        "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300 hover:border-primary/20",
        className
      )}>
        <CardHeader className="bg-gradient-to-r from-orange-500/5 to-transparent pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Rocket className="h-5 w-5 text-orange-500" />
            </div>
            <CardTitle className="text-lg">Launch Zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center py-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5 mx-auto flex items-center justify-center mb-4">
              <Rocket className="h-8 w-8 text-orange-500/60" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No launches scheduled</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Planning a launch? Create a timeline and track your progress
            </p>
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20" asChild>
              <Link to="/wizards/launch">
                <Plus className="h-4 w-4" />
                Plan Your Launch
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Rocket className="h-4 w-4 text-orange-500" />
          </div>
          <h2 className="text-lg font-semibold">Active Launch Zone</h2>
          {launchName && (
            <span className="text-sm text-muted-foreground">• {launchName}</span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="gap-1 group" asChild>
          <Link to="/wizards/launch">
            <Plus className="h-4 w-4" />
            New Launch
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
      
      {/* Content */}
      {children}
    </div>
  );
}
