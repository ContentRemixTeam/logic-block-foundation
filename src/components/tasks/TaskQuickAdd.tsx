import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Command, Zap } from 'lucide-react';

interface ParsedTask {
  text: string;
  date?: Date;
  time?: string;
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
  duration?: number;
}

interface TaskQuickAddProps {
  onAddTask: (task: ParsedTask) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TaskQuickAdd({ onAddTask, placeholder, autoFocus = false }: TaskQuickAddProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedTask | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse natural language input
  const parseInput = (text: string): ParsedTask => {
    const result: ParsedTask = { text: text, tags: [] };
    let cleanText = text;

    // Extract tags (#tag)
    const tagMatches = cleanText.match(/#(\w+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map(t => t.slice(1));
      cleanText = cleanText.replace(/#\w+/g, '').trim();
    }

    // Extract priority (!high, !med, !low)
    const priorityMatch = cleanText.match(/!(high|med|medium|low)/i);
    if (priorityMatch) {
      const p = priorityMatch[1].toLowerCase();
      result.priority = p === 'med' ? 'medium' : p as 'high' | 'medium' | 'low';
      cleanText = cleanText.replace(/!(high|med|medium|low)/i, '').trim();
    }

    // Extract duration (30m, 1h, 2h, etc.)
    const durationMatch = cleanText.match(/(\d+)(m|h|min|hr|hour)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      result.duration = unit.startsWith('h') ? num * 60 : num;
      cleanText = cleanText.replace(/\d+(m|h|min|hr|hour)/i, '').trim();
    }

    // Extract date keywords
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

    // Extract time (2pm, 14:00, etc.)
    const timeMatch = cleanText.match(/\b(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i);
    if (timeMatch) {
      result.time = timeMatch[0];
      cleanText = cleanText.replace(timeMatch[0], '').trim();
    }

    // Clean up multiple spaces
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

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    const parsed = parseInput(input);
    if (parsed.text) {
      onAddTask(parsed);
      setInput('');
      setParsedPreview(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full">
      <div 
        className={cn(
          "relative flex items-center gap-2 p-2 rounded-lg border-2 transition-all bg-background",
          isFocused ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-muted-foreground/30"
        )}
      >
        <Plus className={cn(
          "h-5 w-5 transition-colors",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />
        
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
            <Button 
              size="sm" 
              onClick={handleSubmit}
              className="h-8 gap-1"
            >
              <Zap className="h-3 w-3" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Preview of parsed input */}
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
              <Badge variant="secondary" className="text-xs">
                🕐 {parsedPreview.time}
              </Badge>
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
                  "text-xs",
                  parsedPreview.priority === 'high' && "border-destructive text-destructive",
                  parsedPreview.priority === 'medium' && "border-warning text-warning",
                  parsedPreview.priority === 'low' && "border-muted-foreground"
                )}
              >
                !{parsedPreview.priority}
              </Badge>
            )}
            
            {parsedPreview.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
