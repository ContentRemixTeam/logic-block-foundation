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
import { Loader2, Check, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useUserPlatforms, UserPlatform } from '@/hooks/useUserPlatforms';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import { PLATFORM_LABELS, DEFAULT_PLATFORM_COLORS, AVAILABLE_PLATFORMS } from '@/lib/calendarConstants';
import { cn } from '@/lib/utils';
import { CustomPlatformDialog } from './CustomPlatformDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PlatformConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformConfigModal({ open, onOpenChange }: PlatformConfigModalProps) {
  const { 
    platforms, 
    activePlatforms, 
    customPlatforms,
    togglePlatformAsync, 
    deleteCustomPlatform,
    syncFromCycleStrategy,
    isSyncingFromCycle,
    isToggling,
    isDeletingCustom,
  } = useUserPlatforms();
  
  const { data: activeCycle } = useActiveCycle();
  
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<UserPlatform | null>(null);
  const [deletingPlatform, setDeletingPlatform] = useState<UserPlatform | null>(null);

  // Get active platform names for easy lookup
  const activePlatformNames = new Set(activePlatforms.map(p => p.platform));

  const handleToggle = async (platform: string, isActive: boolean) => {
    setPendingToggles(prev => new Set(prev).add(platform));
    try {
      await togglePlatformAsync({ platform, isActive });
    } catch (error) {
      // Error handled by mutation
    } finally {
      setPendingToggles(prev => {
        const next = new Set(prev);
        next.delete(platform);
        return next;
      });
    }
  };

  const handleDeleteCustom = async () => {
    if (!deletingPlatform) return;
    deleteCustomPlatform(deletingPlatform.id);
    setDeletingPlatform(null);
  };

  const handleEditCustom = (platform: UserPlatform) => {
    setEditingPlatform(platform);
    setCustomDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Configure Platforms</DialogTitle>
            <DialogDescription>
              Toggle the platforms you use. Active platforms appear in your filter bar.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Sync from 90-Day Plan */}
              {activeCycle && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Sync from 90-Day Plan</p>
                      <p className="text-xs text-muted-foreground">
                        Import platforms from your current cycle strategy
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncFromCycleStrategy(activeCycle.cycle_id)}
                      disabled={isSyncingFromCycle}
                    >
                      {isSyncingFromCycle ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-2">Sync</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Default Platforms Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Default Platforms
                </h3>
                <div className="grid gap-2">
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
              </div>

              {/* Custom Platforms Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Custom Platforms
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => {
                      setEditingPlatform(null);
                      setCustomDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>

                {customPlatforms.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                    No custom platforms yet. Add one to track Threads, Pinterest, or any other platform.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {customPlatforms.map((platform) => {
                      const isActive = platform.is_active;
                      const isPending = pendingToggles.has(platform.platform);

                      return (
                        <div
                          key={platform.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border transition-colors',
                            isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: platform.color }}
                            />
                            <div>
                              <Label className="font-medium">
                                {platform.custom_name || platform.platform}
                              </Label>
                              {platform.short_label && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({platform.short_label})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditCustom(platform)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeletingPlatform(platform)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            {isPending && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            <Switch
                              checked={isActive}
                              onCheckedChange={(checked) => handleToggle(platform.platform, checked)}
                              disabled={isPending}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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

      {/* Custom Platform Dialog */}
      <CustomPlatformDialog
        open={customDialogOpen}
        onOpenChange={(open) => {
          setCustomDialogOpen(open);
          if (!open) setEditingPlatform(null);
        }}
        editingPlatform={editingPlatform ? {
          id: editingPlatform.id,
          custom_name: editingPlatform.custom_name || '',
          color: editingPlatform.color,
          short_label: editingPlatform.short_label || '',
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPlatform} onOpenChange={(open) => !open && setDeletingPlatform(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Platform</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPlatform?.custom_name || deletingPlatform?.platform}"? 
              Content items using this platform will still show, but you won't be able to filter by it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustom} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
