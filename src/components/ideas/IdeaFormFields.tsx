import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/ui/character-counter';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  color?: string;
  is_template?: boolean;
}

const PRIORITY_OPTIONS = [
  { value: 'asap', label: 'ASAP', className: 'bg-priority-high' },
  { value: 'next_week', label: 'Next Week', className: 'bg-priority-medium' },
  { value: 'next_month', label: 'Next Month', className: 'bg-status-scheduled' },
  { value: 'someday', label: 'Someday', className: 'bg-status-someday' },
];

interface IdeaFormFieldsProps {
  isEdit: boolean;
  content: string;
  onContentChange: (value: string) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  projectId: string;
  onProjectIdChange: (value: string) => void;
  categories: Category[];
  projects: Project[];
  actionLoading: boolean;
  showInlineCategory: boolean;
  onShowInlineCategoryChange: (value: boolean) => void;
  inlineCategoryName: string;
  onInlineCategoryNameChange: (value: string) => void;
  inlineCategoryColor: string;
  onInlineCategoryColorChange: (value: string) => void;
  onInlineCategoryCreate: () => void;
}

export const IdeaFormFields = memo(function IdeaFormFields({
  isEdit,
  content,
  onContentChange,
  categoryId,
  onCategoryIdChange,
  priority,
  onPriorityChange,
  tags,
  onTagsChange,
  tagInput,
  onTagInputChange,
  projectId,
  onProjectIdChange,
  categories,
  projects,
  actionLoading,
  showInlineCategory,
  onShowInlineCategoryChange,
  inlineCategoryName,
  onInlineCategoryNameChange,
  inlineCategoryColor,
  onInlineCategoryColorChange,
  onInlineCategoryCreate,
}: IdeaFormFieldsProps) {
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      onTagsChange([...tags, tagInput.trim()]);
      onTagInputChange('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={isEdit ? "editContent" : "newContent"}>Idea</Label>
        <Textarea
          id={isEdit ? "editContent" : "newContent"}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={4}
          placeholder="What's your idea?"
          className="resize-none"
          maxLength={1000}
        />
        <CharacterCounter current={content.length} max={1000} className="mt-1" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          {showInlineCategory ? (
            <div className="space-y-2 p-3 border rounded-md bg-muted/30">
              <Input
                placeholder="Category name"
                value={inlineCategoryName}
                onChange={(e) => onInlineCategoryNameChange(e.target.value)}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Color:</Label>
                <input
                  type="color"
                  value={inlineCategoryColor}
                  onChange={(e) => onInlineCategoryColorChange(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={onInlineCategoryCreate}
                  disabled={actionLoading || !inlineCategoryName.trim()}
                >
                  Create
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onShowInlineCategoryChange(false);
                    onInlineCategoryNameChange('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Select value={categoryId || "uncategorized"} onValueChange={(val) => {
              if (val === "__create_new__") {
                onShowInlineCategoryChange(true);
              } else {
                onCategoryIdChange(val === "uncategorized" ? "" : val);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">No category</SelectItem>
                {categories.filter(cat => cat.id).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="__create_new__">
                  <div className="flex items-center gap-2 text-primary">
                    <Plus className="h-3 w-3" />
                    Create new category
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div>
          <Label>Priority</Label>
          <Select value={priority || "none"} onValueChange={(val) => onPriorityChange(val === "none" ? "" : val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No priority</SelectItem>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", opt.className)} />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Project</Label>
        <Select value={projectId || "none"} onValueChange={(val) => onProjectIdChange(val === "none" ? "" : val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No project</SelectItem>
            {projects.filter(p => !p.is_template).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || 'hsl(var(--primary))' }} />
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              <Hash className="h-3 w-3" />
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:bg-destructive/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
