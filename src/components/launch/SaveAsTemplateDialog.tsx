// Save As Template Dialog - Allows users to save a launch as a reusable template

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLaunchTemplates } from '@/hooks/useLaunchTemplates';
import { Bookmark, Loader2 } from 'lucide-react';

interface SaveAsTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  launchId: string;
  launchName: string;
}

export function SaveAsTemplateDialog({
  isOpen,
  onClose,
  launchId,
  launchName,
}: SaveAsTemplateDialogProps) {
  const [templateName, setTemplateName] = useState(`${launchName} Template`);
  const { createFromLaunchDebrief } = useLaunchTemplates();

  const handleSave = async () => {
    if (!templateName.trim()) return;

    try {
      await createFromLaunchDebrief.mutateAsync({
        launchId,
        templateName: templateName.trim(),
      });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this launch configuration as a template to reuse in the future.
            {' '}Your lessons learned from the debrief will be included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Course Launch Template"
            />
            <p className="text-xs text-muted-foreground">
              Choose a descriptive name you'll recognize later
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!templateName.trim() || createFromLaunchDebrief.isPending}
          >
            {createFromLaunchDebrief.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
