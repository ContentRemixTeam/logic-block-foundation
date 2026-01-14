import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useContextTags } from '@/hooks/useContextTags';
import { Plus, X, Settings2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  showManageButton?: boolean;
}

const EMOJI_OPTIONS = ['🏷️', '🎯', '📋', '🎨', '📞', '📧', '🔍', '💡', '⚡', '🔥', '✨', '📝', '🎤', '💻', '📊', '🎬', '🎵', '📸', '🏠', '🚀'];

export function TagManager({ selectedTags, onTagsChange, showManageButton = true }: TagManagerProps) {
  const { tags, hasCustomTags, createTag, deleteTag, seedDefaults, isCreating, isDeleting } = useContextTags();
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('🏷️');
  const [showManage, setShowManage] = useState(false);

  const toggleTag = (value: string) => {
    if (selectedTags.includes(value)) {
      onTagsChange(selectedTags.filter(t => t !== value));
    } else {
      onTagsChange([...selectedTags, value]);
    }
  };

  const handleCreateTag = () => {
    if (!newTagLabel.trim()) return;
    createTag({ label: newTagLabel.trim(), icon: newTagIcon });
    setNewTagLabel('');
    setNewTagIcon('🏷️');
    setShowAddTag(false);
  };

  const handleDeleteTag = (id: string) => {
    deleteTag(id);
  };

  const handleSeedDefaults = () => {
    seedDefaults();
    setShowManage(false);
  };

  return (
    <div className="space-y-2">
      {/* Tag selection */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Badge
            key={tag.value}
            variant={selectedTags.includes(tag.value) ? "default" : "outline"}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => toggleTag(tag.value)}
          >
            {tag.icon} {tag.label}
          </Badge>
        ))}

        {/* Add new tag button */}
        <Popover open={showAddTag} onOpenChange={setShowAddTag}>
          <PopoverTrigger asChild>
            <Badge variant="outline" className="cursor-pointer border-dashed hover:bg-muted">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">New Tag</h4>
              
              {/* Emoji picker */}
              <div>
                <label className="text-xs text-muted-foreground">Icon</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewTagIcon(emoji)}
                      className={cn(
                        "w-7 h-7 rounded hover:bg-muted transition-colors",
                        newTagIcon === emoji && "bg-primary/10 ring-2 ring-primary"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag name */}
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  placeholder="e.g. Planning"
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddTag(false)}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreateTag}
                  disabled={!newTagLabel.trim() || isCreating}
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Manage tags button */}
        {showManageButton && (
          <Popover open={showManage} onOpenChange={setShowManage}>
            <PopoverTrigger asChild>
              <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                <Settings2 className="h-3 w-3" />
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Manage Tags</h4>
                
                {hasCustomTags ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tags.map(tag => (
                      <div 
                        key={tag.id} 
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm">{tag.icon} {tag.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTag(tag.id)}
                          disabled={isDeleting}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      You're using default tags. Create your first custom tag or keep the defaults.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSeedDefaults}
                    >
                      Copy Defaults to My Tags
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Click the + button to add new tags
                </p>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
