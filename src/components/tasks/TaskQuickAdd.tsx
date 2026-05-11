import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Command, Zap } from 'lucide-react';

import type { MomentumType } from '@/lib/momentumTypes';

export interface ParsedTask {
  text: string;
  date?: Date;
  time?: string;
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
  duration?: number;
  /** Mastermind OS — momentum classification, parsed from $revenue / $audience / etc. */
  momentumType?: MomentumType;
  /** Group identifier the inline add originated from (e.g. 'today', 'tomorrow', a project_id). */
  groupId?: string;
  /** Active group-by mode at the time of add (e.g. 'date', 'project', 'priority', 'energy'). */
  groupBy?: string;
}

interface TaskQuickAddProps {
  onAddTask: (task: ParsedTask) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** 'card' (default) shows the full pill card. 'inline' shows a quiet + Add task row that expands. */
  variant?: 'card' | 'inline';
  /** Default scheduled date applied when the user doesn't specify one in natural language. */
  defaultDate?: Date | null;
  /** Group identifier passed back on add — useful for project / priority / energy grouping. */
  defaultGroup?: string;
  /** Group-by mode passed back on add. */
  groupBy?: string;
}

export function TaskQuickAdd({
  onAddTask,
  placeholder,
  autoFocus = false,
  variant = 'card',
  defaultDate,
  defaultGroup,
  groupBy,
}: TaskQuickAddProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(variant !== 'inline');
  const [parsedPreview, setParsedPreview] = useState<ParsedTask | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse natural language input
  const parseInput = (text: string): ParsedTask => {
    const result: ParsedTask = { text: text, tags: [] };
    let cleanText = text;

    const tagMatches = cleanText.match(/#(\w+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map(t => t.slice(1));
      cleanText = cleanText.replace(/#\w+/g, '').trim();
    }

    const priorityMatch = cleanText.match(/!(high|med|medium|low)/i);
    if (priorityMatch) {
      const p = priorityMatch[1].toLowerCase();
      result.priority = p === 'med' ? 'medium' : p as 'high' | 'medium' | 'low';
      cleanText = cleanText.replace(/!(high|med|medium|low)/i, '').trim();
    }

    const durationMatch = cleanText.match(/(\d+)(m|h|min|hr|hour)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      result.duration = unit.startsWith('h') ? num * 60 : num;
      cleanText = cleanText.replace(/\d+(m|h|min|hr|hour)/i, '').trim();
    }

    const today = new Date();
    if (/\btoday\b/i.test(cleanText)) {
      result.date = today;
      cleanText = cleanText.replace(/\btoday\b/i, '').trim();
    } else if (/\btomorrow\b/i.test(cleanText)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.date = tomorrow;
      cleanText = cleanText.replace(/\btomorrow\b/i, '').trim();
    } else if (/\bnext week\b/i.test(cleanText)) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      result.date = nextWeek;
      cleanText = cleanText.replace(/\bnext week\b/i, '').trim();
    }

    const timeMatch = cleanText.match(/\b(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i);
    if (timeMatch) {
      result.time = timeMatch[0];
      cleanText = cleanText.replace(timeMatch[0], '').trim();
    }

    result.text = cleanText.replace(/\s+/g, ' ').trim();
    return result;
  };

  useEffect(() => {
    if (input.trim()) {
      setParsedPreview(parseInput(input));
    } else {
      setParsedPreview(null);
    }
  }, [input]);

  // Cmd+K only for the prominent card variant
  useEffect(() => {
    if (variant !== 'card') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [variant]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const parsed = parseInput(input);
    if (!parsed.text) return;

    // Apply group context defaults if user didn't override via natural language
    if (!parsed.date && defaultDate) parsed.date = defaultDate;
    parsed.groupId = defaultGroup;
    parsed.groupBy = groupBy;

    onAddTask(parsed);
    setInput('');
    setParsedPreview(null);
    if (variant === 'inline') {
      // Stay expanded so the user can keep adding tasks rapidly; refocus.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && variant === 'inline') {
      setInput('');
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  // Inline variant — quiet "+ Add task" row that expands inline.
  if (variant === 'inline') {
    if (!isExpanded) {
      return (
        <button
          type="button"
          onClick={() => {
            setIsExpanded(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="group flex items-center gap-2 w-full text-left text-xs text-muted-foreground/70 hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-muted/40"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add task</span>
        </button>
      );
    }
    return (
      <div className="space-y-1.5">
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md border bg-background transition-colors',
            isFocused ? 'border-primary/60' : 'border-border'
          )}
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              if (!input.trim()) setIsExpanded(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Add a task… (Enter to save, Esc to cancel)'}
            className="border-0 shadow-none focus-visible:ring-0 text-sm px-0 h-auto py-0 bg-transparent"
            autoFocus={autoFocus}
          />
          {input.trim() && (
            <Button size="sm" onClick={handleSubmit} className="h-6 px-2 text-xs">
              Add
            </Button>
          )}
        </div>
        {parsedPreview && (parsedPreview.date || parsedPreview.priority || parsedPreview.tags.length > 0 || parsedPreview.duration) && (
          <div className="flex flex-wrap items-center gap-1 px-2 text-[10px] text-muted-foreground">
            {parsedPreview.date && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                📅 {parsedPreview.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Badge>
            )}
            {parsedPreview.priority && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">!{parsedPreview.priority}</Badge>
            )}
            {parsedPreview.duration && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                ⏱️ {parsedPreview.duration >= 60 ? `${parsedPreview.duration / 60}h` : `${parsedPreview.duration}m`}
              </Badge>
            )}
            {parsedPreview.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5">#{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default 'card' variant — preserved exactly.
  return (
    <div className="w-full">
      <div
        className={cn(
          'relative flex items-center gap-2 p-2 rounded-lg border-2 transition-all bg-background',
          isFocused ? 'border-primary shadow-lg shadow-primary/10' : 'border-border hover:border-muted-foreground/30'
        )}
      >
        <Plus className={cn('h-5 w-5 transition-colors', isFocused ? 'text-primary' : 'text-muted-foreground')} />
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Add a task... (try: 'Write report tomorrow 2pm #deep-work 1h')"}
          className="border-0 shadow-none focus-visible:ring-0 text-base px-0 h-auto py-1"
          autoFocus={autoFocus}
        />
        <div className="flex items-center gap-2">
          {!isFocused && (
            <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
              <Command className="h-3 w-3" />K
            </Badge>
          )}
          {input.trim() && (
            <Button size="sm" onClick={handleSubmit} className="h-8 gap-1">
              <Zap className="h-3 w-3" />
              Add
            </Button>
          )}
        </div>
      </div>

      {parsedPreview && (isFocused || input) && (
        <div className="mt-2 p-2 rounded-md bg-muted/50 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground">{parsedPreview.text || '(enter task name)'}</span>
            {parsedPreview.date && (
              <Badge variant="secondary" className="text-xs">
                📅 {parsedPreview.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Badge>
            )}
            {parsedPreview.time && (
              <Badge variant="secondary" className="text-xs">🕐 {parsedPreview.time}</Badge>
            )}
            {parsedPreview.duration && (
              <Badge variant="secondary" className="text-xs">
                ⏱️ {parsedPreview.duration >= 60 ? `${parsedPreview.duration / 60}h` : `${parsedPreview.duration}m`}
              </Badge>
            )}
            {parsedPreview.priority && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  parsedPreview.priority === 'high' && 'border-destructive text-destructive',
                  parsedPreview.priority === 'medium' && 'border-warning text-warning',
                  parsedPreview.priority === 'low' && 'border-muted-foreground'
                )}
              >
                !{parsedPreview.priority}
              </Badge>
            )}
            {parsedPreview.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
