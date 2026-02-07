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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSaveToVault, getSuggestedTitle, mapContentTypeToCalendar } from '@/hooks/useSaveToVault';
import { ContentType } from '@/types/aiCopywriting';
import { Loader2, Archive, X, Plus } from 'lucide-react';

interface SaveToVaultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedCopy: string;
  contentType: ContentType;
  generationId?: string;
  onSuccess?: () => void;
}

const PLATFORM_OPTIONS = [
  { value: '', label: 'None / Other' },
  { value: 'email', label: 'Email' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'blog', label: 'Blog' },
  { value: 'website', label: 'Website' },
];

export function SaveToVaultModal({
  open,
  onOpenChange,
  generatedCopy,
  contentType,
  generationId,
  onSuccess,
}: SaveToVaultModalProps) {
  const saveToVault = useSaveToVault();
  const calendarMapping = mapContentTypeToCalendar(contentType);

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle(getSuggestedTitle(contentType));
      setPlatform(calendarMapping.channel || '');
      setTags(['ai-generated']);
      setTagInput('');
    }
  }, [open, contentType, calendarMapping.channel]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    await saveToVault.mutateAsync({
      title: title.trim(),
      body: generatedCopy,
      contentType,
      channel: platform || undefined,
      tags,
      generationId,
    });

    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Save to Content Vault
          </DialogTitle>
          <DialogDescription>
            Save this copy to your vault for future use. You can schedule it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="vault-title">Title</Label>
            <Input
              id="vault-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this copy a name..."
            />
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <Label>Platform (Optional)</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform..." />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Helps organize your vault content
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Copy Preview</Label>
            <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
              {generatedCopy.slice(0, 200)}
              {generatedCopy.length > 200 && '...'}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || saveToVault.isPending}
          >
            {saveToVault.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Save to Vault
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
