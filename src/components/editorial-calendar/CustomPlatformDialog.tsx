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
import { Loader2 } from 'lucide-react';
import { useUserPlatforms } from '@/hooks/useUserPlatforms';

interface CustomPlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlatform?: {
    id: string;
    custom_name: string;
    color: string;
    short_label: string;
  } | null;
}

const PRESET_COLORS = [
  '#E4405F', // Instagram red
  '#0A66C2', // LinkedIn blue
  '#FF0000', // YouTube red
  '#1DA1F2', // Twitter blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#000000', // Black
];

export function CustomPlatformDialog({ 
  open, 
  onOpenChange,
  editingPlatform,
}: CustomPlatformDialogProps) {
  const { addCustomPlatformAsync, updateCustomPlatform, isAddingCustom } = useUserPlatforms();
  
  const [name, setName] = useState(editingPlatform?.custom_name || '');
  const [color, setColor] = useState(editingPlatform?.color || '#6B7280');
  const [shortLabel, setShortLabel] = useState(editingPlatform?.short_label || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setColor('#6B7280');
    setShortLabel('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingPlatform) {
        await updateCustomPlatform({
          id: editingPlatform.id,
          updates: {
            custom_name: name.trim(),
            color,
            short_label: shortLabel.trim() || name.slice(0, 3).toUpperCase(),
          },
        });
      } else {
        await addCustomPlatformAsync({
          name: name.trim(),
          color,
          shortLabel: shortLabel.trim() || undefined,
        });
      }
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate short label as user types
  const handleNameChange = (value: string) => {
    setName(value);
    if (!shortLabel || shortLabel === name.slice(0, 3).toUpperCase()) {
      setShortLabel(value.slice(0, 3).toUpperCase());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {editingPlatform ? 'Edit Platform' : 'Add Custom Platform'}
          </DialogTitle>
          <DialogDescription>
            {editingPlatform 
              ? 'Update your custom platform settings.'
              : 'Add a platform that\'s not in the default list.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Platform Name */}
          <div className="grid gap-2">
            <Label htmlFor="platform-name">Platform Name *</Label>
            <Input
              id="platform-name"
              placeholder="e.g., Threads, Pinterest, Substack"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Short Label */}
          <div className="grid gap-2">
            <Label htmlFor="short-label">
              Short Label <span className="text-muted-foreground">(max 3 chars)</span>
            </Label>
            <Input
              id="short-label"
              placeholder="e.g., THR, PIN"
              value={shortLabel}
              onChange={(e) => setShortLabel(e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Shows on calendar badges
            </p>
          </div>

          {/* Color Picker */}
          <div className="grid gap-2">
            <Label>Display Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === presetColor 
                      ? 'border-foreground scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="custom-color" className="text-xs text-muted-foreground">
                Or custom:
              </Label>
              <Input
                id="custom-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-8 p-0.5 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
          </div>

          {/* Preview */}
          <div className="grid gap-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-2">
              <div
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: color,
                  color: color,
                  border: '1px solid',
                }}
              >
                {shortLabel || name.slice(0, 3).toUpperCase() || 'ABC'}
              </div>
              <span className="text-sm text-muted-foreground">
                {name || 'Platform Name'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingPlatform ? 'Save Changes' : 'Add Platform'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
