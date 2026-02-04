import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface IdeaData {
  categoryId: string | null;
  priority: string | null;
  tags: string[];
  projectId: string | null;
}

interface IdeaCategory {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  color?: string | null;
}

interface IdeaQuickChipsProps {
  ideaData: IdeaData;
  onUpdate: (data: IdeaData) => void;
  categories: IdeaCategory[];
  projects: Project[];
}

const PRIORITY_OPTIONS = [
  { value: 'asap', label: 'ASAP', emoji: '🔥' },
  { value: 'next_week', label: 'Next Week', emoji: '📅' },
  { value: 'next_month', label: 'Next Month', emoji: '📆' },
  { value: 'someday', label: 'Someday', emoji: '💭' },
];

export function IdeaQuickChips({ ideaData, onUpdate, categories, projects }: IdeaQuickChipsProps) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().replace(/^#/, '');
    if (trimmedTag && !ideaData.tags.includes(trimmedTag)) {
      onUpdate({ ...ideaData, tags: [...ideaData.tags, trimmedTag] });
    }
    setNewTag('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({ ...ideaData, tags: ideaData.tags.filter(t => t !== tagToRemove) });
  };

  // Filter out template projects
  const activeProjects = projects.filter(p => !(p as any).is_template);

  return (
    <div className="space-y-2 pt-2 border-t border-border/50">
      {/* Category row */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <span className="text-xs text-muted-foreground flex items-center mr-1 flex-shrink-0">🏷️</span>
          {categories.map(cat => (
            <QuickChip
              key={cat.id}
              active={ideaData.categoryId === cat.id}
              onClick={() => onUpdate({ 
                ...ideaData, 
                categoryId: ideaData.categoryId === cat.id ? null : cat.id 
              })}
            >
              <span 
                className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" 
                style={{ backgroundColor: cat.color || 'hsl(var(--primary))' }} 
              />
              {cat.name}
            </QuickChip>
          ))}
        </div>
      )}

      {/* Priority row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <span className="text-xs text-muted-foreground flex items-center mr-1 flex-shrink-0">⏰</span>
        {PRIORITY_OPTIONS.map(p => (
          <QuickChip
            key={p.value}
            active={ideaData.priority === p.value}
            onClick={() => onUpdate({ 
              ...ideaData, 
              priority: ideaData.priority === p.value ? null : p.value 
            })}
          >
            {p.emoji} {p.label}
          </QuickChip>
        ))}
      </div>

      {/* Project row */}
      {activeProjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <span className="text-xs text-muted-foreground flex items-center mr-1 flex-shrink-0">📁</span>
          {activeProjects.slice(0, 6).map(proj => (
            <QuickChip
              key={proj.id}
              active={ideaData.projectId === proj.id}
              onClick={() => onUpdate({ 
                ...ideaData, 
                projectId: ideaData.projectId === proj.id ? null : proj.id 
              })}
            >
              <span 
                className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" 
                style={{ backgroundColor: proj.color || 'hsl(var(--primary))' }} 
              />
              {proj.name}
            </QuickChip>
          ))}
        </div>
      )}

      {/* Tags row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide items-center">
        <span className="text-xs text-muted-foreground flex items-center mr-1 flex-shrink-0">#</span>
        
        {/* Existing tags */}
        {ideaData.tags.map(tag => (
          <QuickChip
            key={tag}
            active
            onClick={() => handleRemoveTag(tag)}
          >
            #{tag}
            <X className="h-3 w-3 ml-1" />
          </QuickChip>
        ))}
        
        {/* Add tag input or button */}
        {showTagInput ? (
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                } else if (e.key === 'Escape') {
                  setShowTagInput(false);
                  setNewTag('');
                }
              }}
              onBlur={handleAddTag}
              placeholder="tag..."
              className="h-8 w-24 text-sm"
              autoFocus
            />
          </div>
        ) : (
          <QuickChip onClick={() => setShowTagInput(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Tag
          </QuickChip>
        )}
      </div>
    </div>
  );
}

// Individual chip component - matching QuickChips style
function QuickChip({ 
  children, 
  active, 
  onClick,
}: { 
  children: React.ReactNode; 
  active?: boolean; 
  onClick: () => void; 
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
        "border min-h-[36px] flex-shrink-0",
        active 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-muted/50 text-foreground border-border hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
