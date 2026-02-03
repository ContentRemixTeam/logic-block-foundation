import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check } from 'lucide-react';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';
import { PLATFORM_LABELS, DEFAULT_PLATFORM_COLORS, AVAILABLE_PLATFORMS } from '@/lib/calendarConstants';
import { cn } from '@/lib/utils';

interface PlatformConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformConfigModal({ open, onOpenChange }: PlatformConfigModalProps) {
  const { platforms, activePlatforms, togglePlatform, isToggling } = useUserPlatforms();
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  // Get active platform names for easy lookup
  const activePlatformNames = new Set(activePlatforms.map(p => p.platform));

  const handleToggle = async (platform: string, isActive: boolean) => {
    setPendingToggles(prev => new Set(prev).add(platform));
    try {
      togglePlatform({ platform, isActive });
    } finally {
      // Remove after a brief delay to allow UI update
      setTimeout(() => {
        setPendingToggles(prev => {
          const next = new Set(prev);
          next.delete(platform);
          return next;
        });
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Platforms</DialogTitle>
          <DialogDescription>
            Toggle the platforms you use. Active platforms appear in your filter bar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="grid gap-3 py-4">
            {AVAILABLE_PLATFORMS.map((platform) => {
              const isActive = activePlatformNames.has(platform);
              const isPending = pendingToggles.has(platform);
              const color = DEFAULT_PLATFORM_COLORS[platform] || '#6B7280';
              const label = PLATFORM_LABELS[platform] || platform;

              return (
                <div
                  key={platform}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <Label htmlFor={`platform-${platform}`} className="font-medium cursor-pointer">
                      {label}
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      id={`platform-${platform}`}
                      checked={isActive}
                      onCheckedChange={(checked) => handleToggle(platform, checked)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
            <Check className="h-4 w-4 text-primary" />
            <span>{activePlatforms.length} platforms active</span>
          </div>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
