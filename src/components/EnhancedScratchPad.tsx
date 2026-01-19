import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ListTodo, Lightbulb, Brain, Trophy, Tag } from 'lucide-react';

interface EnhancedScratchPadProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

const TAGS = [
  { tag: '#task', icon: ListTodo, label: 'Task', description: 'Add to your task list', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
  { tag: '#idea', icon: Lightbulb, label: 'Idea', description: 'Save to ideas bank', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' },
  { tag: '#thought', icon: Brain, label: 'Thought', description: 'Save as useful insight', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300' },
  { tag: '#win', icon: Trophy, label: 'Win', description: 'Celebrate a victory', color: 'bg-green-500/20 text-green-700 dark:text-green-300' },
  { tag: '#offer', icon: Tag, label: 'Offer', description: 'Mark that you made an offer', color: 'bg-pink-500/20 text-pink-700 dark:text-pink-300' },
];

export function EnhancedScratchPad({
  value,
  onChange,
  onBlur,
  placeholder = 'Write freely...',
  className,
  maxLength = 5000,
}: EnhancedScratchPadProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hashPosition, setHashPosition] = useState<number | null>(null);

  // Sync scroll between textarea and highlight overlay
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Get caret coordinates
  const getCaretCoordinates = useCallback((element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = getComputedStyle(element);
    
    // Copy textarea styles
    const properties = [
      'fontFamily', 'fontSize', 'fontWeight', 'wordWrap', 'whiteSpace',
      'borderLeftWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth',
      'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom',
      'lineHeight', 'letterSpacing'
    ];
    
    properties.forEach(prop => {
      div.style[prop as any] = style[prop as keyof CSSStyleDeclaration] as string;
    });
    
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = `${element.clientWidth}px`;
    
    const textBefore = element.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = textBefore;
    div.appendChild(span);
    
    const marker = document.createElement('span');
    marker.textContent = '|';
    div.appendChild(marker);
    
    document.body.appendChild(div);
    
    const rect = element.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    
    const coordinates = {
      top: markerRect.top - rect.top + element.scrollTop,
      left: markerRect.left - rect.left + element.scrollLeft,
    };
    
    document.body.removeChild(div);
    
    return coordinates;
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Check if user just typed '#'
    if (newValue[cursorPos - 1] === '#') {
      // Check if it's a fresh # (not part of an existing tag)
      const beforeHash = newValue.substring(0, cursorPos - 1);
      const lastSpace = Math.max(beforeHash.lastIndexOf(' '), beforeHash.lastIndexOf('\n'));
      const textBeforeHash = beforeHash.substring(lastSpace + 1);
      
      if (textBeforeHash === '' || textBeforeHash.match(/^\s*$/)) {
        // Show autocomplete
        setHashPosition(cursorPos - 1);
        setSelectedIndex(0);
        
        try {
          const coords = getCaretCoordinates(e.target, cursorPos);
          setAutocompletePosition({
            top: coords.top + 24,
            left: coords.left,
          });
          setShowAutocomplete(true);
        } catch {
          // Fallback position
          setAutocompletePosition({ top: 24, left: 0 });
          setShowAutocomplete(true);
        }
      }
    } else if (showAutocomplete) {
      // Check if we should hide autocomplete (typed non-tag character)
      const afterHash = newValue.substring(hashPosition || 0, cursorPos);
      const matchingTag = TAGS.find(t => t.tag.toLowerCase().startsWith(afterHash.toLowerCase()));
      
      if (!matchingTag || afterHash.includes(' ') || afterHash.includes('\n')) {
        setShowAutocomplete(false);
        setHashPosition(null);
      }
    }
    
    onChange(newValue);
  }, [onChange, showAutocomplete, hashPosition, getCaretCoordinates]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % TAGS.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + TAGS.length) % TAGS.length);
        break;
      case 'Enter':
      case 'Tab':
        if (showAutocomplete) {
          e.preventDefault();
          insertTag(TAGS[selectedIndex].tag);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        setHashPosition(null);
        break;
    }
  }, [showAutocomplete, selectedIndex]);

  // Insert selected tag
  const insertTag = useCallback((tag: string) => {
    if (textareaRef.current && hashPosition !== null) {
      const cursorPos = textareaRef.current.selectionStart;
      const beforeHash = value.substring(0, hashPosition);
      const afterCursor = value.substring(cursorPos);
      
      const newValue = beforeHash + tag + ' ' + afterCursor;
      onChange(newValue);
      
      // Move cursor after the inserted tag
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = hashPosition + tag.length + 1;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowAutocomplete(false);
    setHashPosition(null);
  }, [value, onChange, hashPosition]);

  // Highlight hashtags in the text
  const highlightedContent = useCallback(() => {
    if (!value) return '';
    
    let result = value;
    
    // Replace each tag type with a highlighted version
    TAGS.forEach(({ tag, color }) => {
      const regex = new RegExp(`(${tag})\\b`, 'gi');
      result = result.replace(regex, `<mark class="${color} rounded px-1 font-medium">$1</mark>`);
    });
    
    // Add a zero-width space at the end to maintain height
    return result + '\u200B';
  }, [value]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
        setHashPosition(null);
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="relative">
      {/* Highlight overlay */}
      <div
        ref={highlightRef}
        className={cn(
          "absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words",
          "font-mono text-sm p-3 text-transparent",
          className
        )}
        style={{ 
          wordBreak: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: highlightedContent() }}
        aria-hidden="true"
      />
      
      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        onScroll={syncScroll}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          "relative bg-transparent resize-y font-mono text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "rounded-md border border-input p-3",
          className
        )}
        style={{ 
          caretColor: 'currentColor',
          WebkitTextFillColor: 'currentColor',
        }}
      />
      
      {/* Autocomplete dropdown */}
      {showAutocomplete && (
        <div
          className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          style={{
            top: autocompletePosition.top,
            left: Math.min(autocompletePosition.left, 200),
            minWidth: '200px',
          }}
        >
          {TAGS.map((tag, index) => {
            const Icon = tag.icon;
            return (
              <button
                key={tag.tag}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                  index === selectedIndex ? "bg-accent" : "hover:bg-muted"
                )}
                onClick={() => insertTag(tag.tag)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Icon className={cn("h-4 w-4", tag.color.split(' ')[1])} />
                <div className="flex-1">
                  <div className="font-medium">{tag.tag}</div>
                  <div className="text-xs text-muted-foreground">{tag.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
