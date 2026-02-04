import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, Plus, Trash2 } from 'lucide-react';
import { useUserContentTypes, UserContentType } from '@/hooks/useUserContentTypes';
import { cn } from '@/lib/utils';
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

interface ContentTypeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentTypeConfigModal({ open, onOpenChange }: ContentTypeConfigModalProps) {
  const { 
    contentTypes, 
    activeContentTypes,
    toggleContentTypeAsync, 
    addCustomContentType,
    deleteContentType,
    isToggling,
    isAdding,
  } = useUserContentTypes();
  
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [newTypeName, setNewTypeName] = useState('');
  const [deletingType, setDeletingType] = useState<UserContentType | null>(null);

  const handleToggle = async (typeKey: string, isActive: boolean) => {
    setPendingToggles(prev => new Set(prev).add(typeKey));
    try {
      await toggleContentTypeAsync({ typeKey, isActive });
    } catch (error) {
      // Error handled by mutation
    } finally {
      setPendingToggles(prev => {
        const next = new Set(prev);
        next.delete(typeKey);
        return next;
      });
    }
  };

  const handleAddCustom = () => {
    if (!newTypeName.trim()) return;
    addCustomContentType({ typeLabel: newTypeName.trim() });
    setNewTypeName('');
  };

  const handleDeleteType = async () => {
    if (!deletingType) return;
    deleteContentType(deletingType.id);
    setDeletingType(null);
  };

  // Separate default vs custom types
  const defaultTypes = contentTypes.filter(t => !t.is_custom);
  const customTypes = contentTypes.filter(t => t.is_custom);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Configure Content Types</DialogTitle>
            <DialogDescription>
              Toggle the content types you use. Active types appear in your content menu.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Default Types Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Default Content Types
                </h3>
                <div className="grid gap-2">
                  {defaultTypes.map((type) => {
                    const isPending = pendingToggles.has(type.type_key);

                    return (
                      <div
                        key={type.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-colors',
                          type.is_active ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
                        )}
                      >
                        <Label htmlFor={`type-${type.type_key}`} className="font-medium cursor-pointer">
                          {type.type_label}
                        </Label>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Switch
                            id={`type-${type.type_key}`}
                            checked={type.is_active}
                            onCheckedChange={(checked) => handleToggle(type.type_key, checked)}
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Types Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Custom Content Types
                </h3>

                {/* Add new custom type */}
                <div className="flex gap-2">
                  <Input
                    placeholder="New content type name..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddCustom}
                    disabled={!newTypeName.trim() || isAdding}
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {customTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                    No custom types yet. Add one for specialized content like "Case Study" or "Tutorial".
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {customTypes.map((type) => {
                      const isPending = pendingToggles.has(type.type_key);

                      return (
                        <div
                          key={type.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border transition-colors',
                            type.is_active ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
                          )}
                        >
                          <Label className="font-medium">
                            {type.type_label}
                          </Label>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeletingType(type)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            {isPending && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            <Switch
                              checked={type.is_active}
                              onCheckedChange={(checked) => handleToggle(type.type_key, checked)}
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
              <span>{activeContentTypes.length} types active</span>
            </div>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingType} onOpenChange={(open) => !open && setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingType?.type_label}"? 
              Content items using this type will still show, but you won't be able to select it for new content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
