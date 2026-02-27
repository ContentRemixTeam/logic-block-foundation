import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CharacterCounter } from '@/components/ui/character-counter';
import { cn } from '@/lib/utils';
import { ListTodo, Lightbulb, Brain, Trophy } from 'lucide-react';

interface SmartScratchPadProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

interface TagConfig {
  tag: string;
  label: string;
  icon: React.ReactNode;
  emoji: string;
  description: string;
  bgColor: string;
  textColor: string;
  badgeBg: string;
}

const TAGS: TagConfig[] = [
  {
    tag: 'task',
    label: 'Task',
    icon: <ListTodo className="h-3.5 w-3.5" />,
    emoji: '📋',
    description: 'Add to task list',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  },
  {
    tag: 'idea',
    label: 'Idea',
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    emoji: '💡',
    description: 'Save to ideas',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  },
  {
    tag: 'thought',
    label: 'Thought',
    icon: <Brain className="h-3.5 w-3.5" />,
    emoji: '🧠',
    description: 'Capture insight',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    textColor: 'text-purple-700 dark:text-purple-300',
    badgeBg: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  },
  {
    tag: 'win',
    label: 'Win',
    icon: <Trophy className="h-3.5 w-3.5" />,
    emoji: '🏆',
    description: 'Celebrate victory',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    textColor: 'text-green-700 dark:text-green-300',
    badgeBg: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
  },
];

export function SmartScratchPad({
  value,
  onChange,
  onBlur,
  maxLength = 5000,
  placeholder = "Brain dump here... Type # for tag suggestions",
  className,
}: SmartScratchPadProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [hashPosition, setHashPosition] = useState<number | null>(null);

  // Sync scroll between textarea and highlight overlay
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Count tags in content
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TAGS.forEach(({ tag }) => {
      const regex = new RegExp(`#${tag}\b`, 'gi');
      const matches = value.match(regex);
      counts[tag] = matches ? matches.length : 0;
    });
    return counts;
  }, [value]);

  const totalTagged = useMemo(() => {
    return Object.values(tagCounts).reduce((sum, count) => sum + count, 0);
  }, [tagCounts]);

  // Insert tag at cursor position
  const insertTag = useCallback((tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // If we're completing from a #, replace from hash position
    if (hashPosition !== null) {
      const before = value.substring(0, hashPosition);
      const after = value.substring(start);
      const newValue = `${before}#${tag} ${after}`;
      onChange(newValue);
      
      // Set cursor after the inserted tag
      setTimeout(() => {
        const newPosition = hashPosition + tag.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    } else {
      // Insert fresh tag
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = `${before}#${tag} ${after}`;
      onChange(newValue);
      
      setTimeout(() => {
        const newPosition = start + tag.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
    
    setShowAutocomplete(false);
    setHashPosition(null);
  }, [value, onChange, hashPosition]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    
    // Check if user just typed # or is typing after #
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
      const textAfterHash = textBeforeCursor.substring(lastHashIndex + 1);
      // Show autocomplete if # is at end or followed by partial tag (no space)
      if (textAfterHash === '' || (!textAfterHash.includes(' ') && textAfterHash.length < 10)) {
        setHashPosition(lastHashIndex);
        setShowAutocomplete(true);
        setSelectedIndex(0);
        
        // Calculate position for autocomplete dropdown
        const lineHeight = 20;
        const charWidth = 8;
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const currentCol = lines[lines.length - 1].length;
        
        setAutocompletePosition({
          top: (currentLine + 1) * lineHeight + 8,
          left: Math.min(currentCol * charWidth, 200),
        });
        return;
      }
    }
    
    setShowAutocomplete(false);
    setHashPosition(null);
  };

  // Filter tags based on what user typed after #
  const filteredTags = useMemo(() => {
    if (hashPosition === null || !textareaRef.current) return TAGS;
    
    const cursorPos = textareaRef.current.selectionStart;
    const textAfterHash = value.substring(hashPosition + 1, cursorPos).toLowerCase();
    
    if (!textAfterHash) return TAGS;
    
    return TAGS.filter(({ tag }) => tag.startsWith(textAfterHash));
  }, [hashPosition, value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredTags.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredTags.length) % filteredTags.length);
        break;
      case 'Enter':
        if (filteredTags.length > 0) {
          e.preventDefault();
          insertTag(filteredTags[selectedIndex].tag);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        setHashPosition(null);
        break;
      case 'Tab':
        if (filteredTags.length > 0) {
          e.preventDefault();
          insertTag(filteredTags[selectedIndex].tag);
        }
        break;
    }
  };

  // Close autocomplete when clicking outside (but not on dropdown)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideTextarea = textareaRef.current && !textareaRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideTextarea && isOutsideDropdown) {
        setShowAutocomplete(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render highlighted content - highlights entire lines that contain tags
  const renderHighlightedContent = useMemo(() => {
    if (!value) return null;

    // Process line by line to highlight entire lines with tags
    const lines = value.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Check if this line contains any tag
      const tagMatch = line.match(/#(task|idea|thought|win)\b/i);
      
      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();
        const tagConfig = TAGS.find(t => t.tag === tagName);
        
        if (tagConfig) {
          // Get the content before the hashtag (this is what will be saved)
          const hashIndex = line.indexOf('#');
          const contentBeforeHash = line.substring(0, hashIndex).trim();
          const tagPart = tagMatch[0];
          const afterTag = line.substring(hashIndex + tagPart.length);
          
          return (
            <div 
              key={`line-${lineIndex}`} 
              className={cn(
                'rounded-sm px-1 -mx-1 transition-colors',
                tagConfig.bgColor,
              )}
            >
              {/* Content that will be saved - shown with emphasis */}
              {contentBeforeHash && (
                <span className={cn('font-medium', tagConfig.textColor)}>
                  {contentBeforeHash}
                </span>
              )}
              {contentBeforeHash && ' '}
              {/* The tag itself */}
              <span className={cn(
                'inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-bold uppercase tracking-wide',
                tagConfig.textColor,
                'bg-white/50 dark:bg-black/20'
              )}>
                {tagConfig.emoji} {tagPart}
              </span>
              {/* Any text after the tag */}
              {afterTag && <span className="opacity-60">{afterTag}</span>}
            </div>
          );
        }
      }
      
      // Regular line without tags - show as dimmed/untagged
      return (
        <div 
          key={`line-${lineIndex}`}
          className={cn(
            line.trim() ? 'text-muted-foreground' : '',
          )}
        >
          {line || '\u200B'} {/* Zero-width space for empty lines to maintain height */}
        </div>
      );
    });
  }, [value]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Quick Tag Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map(({ tag, label, emoji, badgeBg }) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertTag(tag)}
              className={cn(
                "h-7 px-2 text-xs gap-1 transition-colors",
                tagCounts[tag] > 0 && badgeBg
              )}
            >
              <span>{emoji}</span>
              <span>{label}</span>
              {tagCounts[tag] > 0 && (
                <span className="ml-0.5 text-[10px] font-bold">({tagCounts[tag]})</span>
              )}
            </Button>
          ))}
        </div>
        {totalTagged > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalTagged} item{totalTagged !== 1 ? 's' : ''} tagged
          </Badge>
        )}
      </div>

      {/* Textarea with Highlighting Overlay */}
      <div className="relative">
        {/* Highlighting layer (behind textarea) */}
        <div
          ref={highlightRef}
          className="absolute inset-0 p-3 font-mono text-sm whitespace-pre-wrap break-words pointer-events-none overflow-hidden leading-[20px]"
          aria-hidden="true"
        >
          {renderHighlightedContent}
        </div>

        {/* Actual textarea (transparent text, visible caret) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          onScroll={handleScroll}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            "w-full min-h-[200px] max-h-[500px] p-3 font-mono text-sm resize-none rounded-md border border-input bg-transparent leading-[20px] overflow-y-auto",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "placeholder:text-muted-foreground",
            "text-transparent"
          )}
          style={{ 
            caretColor: 'auto',
            WebkitTextFillColor: 'transparent',
          }}
        />

        {/* Autocomplete Dropdown */}
        {showAutocomplete && filteredTags.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-[100] w-56 bg-popover border border-border rounded-lg shadow-lg overflow-hidden pointer-events-auto"
            style={{
              top: autocompletePosition.top,
              left: autocompletePosition.left,
            }}
          >
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b bg-muted/50">
              Choose a tag:
            </div>
            {filteredTags.map((tag, index) => (
              <button
                key={tag.tag}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertTag(tag.tag);
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className={cn("flex items-center justify-center w-6 h-6 rounded", tag.bgColor)}>
                  {tag.emoji}
                </span>
                <div className="flex-1">
                  <div className="font-medium">#{tag.tag}</div>
                  <div className="text-xs text-muted-foreground">{tag.description}</div>
                </div>
              </button>
            ))}
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground border-t bg-muted/50">
              ↑↓ navigate • Enter select • Esc close
            </div>
          </div>
        )}
      </div>

      {/* Character Counter */}
      <div className="flex justify-end">
        <CharacterCounter current={value.length} max={maxLength} />
      </div>
    </div>
  );
}
