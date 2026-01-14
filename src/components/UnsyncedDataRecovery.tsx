import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Check, Trash2, RefreshCw, Database } from 'lucide-react';
import { getPendingMutations, clearMutationQueue, type QueuedMutation } from '@/lib/offlineDb';
import { useToast } from '@/hooks/use-toast';

interface UnsyncedDataRecoveryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncNow?: () => Promise<void>;
}

export function UnsyncedDataRecovery({ open, onOpenChange, onSyncNow }: UnsyncedDataRecoveryProps) {
  const { toast } = useToast();
  const [pendingMutations, setPendingMutations] = useState<QueuedMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    if (open) {
      loadPendingMutations();
    }
  }, [open]);

  const loadPendingMutations = async () => {
    try {
      const mutations = await getPendingMutations();
      setPendingMutations(mutations);
    } catch (error) {
      console.error('Failed to load pending mutations:', error);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      if (onSyncNow) {
        await onSyncNow();
      }
      toast({ title: 'Sync complete!', description: 'Your offline changes have been saved.' });
      onOpenChange(false);
    } catch (error) {
      console.error('Sync failed:', error);
      toast({ title: 'Sync failed', description: 'Some changes could not be saved.', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscardChanges = async () => {
    setIsDiscarding(true);
    try {
      await clearMutationQueue();
      toast({ title: 'Changes discarded', description: 'Local offline changes have been removed.' });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to discard changes:', error);
      toast({ title: 'Failed to discard', variant: 'destructive' });
    } finally {
      setIsDiscarding(false);
    }
  };

  const groupedMutations = pendingMutations.reduce((acc, mutation) => {
    const key = mutation.type || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(mutation);
    return acc;
  }, {} as Record<string, QueuedMutation[]>);

  const formatType = (type: string): string => {
    return type.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (pendingMutations.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Unsaved Changes Found
          </DialogTitle>
          <DialogDescription>
            We found {pendingMutations.length} change{pendingMutations.length !== 1 ? 's' : ''} from your last offline session.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border bg-muted/50 p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                These changes were made while you were offline.
              </p>
            </div>
          </div>

          <ScrollArea className="h-[150px]">
            <div className="space-y-2">
              {Object.entries(groupedMutations).map(([type, mutations]) => (
                <div key={type} className="flex items-center justify-between p-2 rounded bg-background border">
                  <span className="text-sm font-medium">{formatType(type)}</span>
                  <Badge variant="secondary">{mutations.length}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDiscardChanges} disabled={isDiscarding || isSyncing} className="w-full sm:w-auto">
            {isDiscarding ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Discard Changes
          </Button>
          <Button onClick={handleSyncNow} disabled={isSyncing || isDiscarding} className="w-full sm:w-auto">
            {isSyncing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Sync Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
