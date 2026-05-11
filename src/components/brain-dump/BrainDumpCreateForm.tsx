import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Hash, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BrainDumpCategory } from '@/hooks/useBrainDump';
import { cn } from '@/lib/utils';

interface BrainDumpCreateFormProps {
  /** Submit a multi-line raw blob; the hook splits + routes by tag. */
  onSubmitRaw: (raw: string, fallback: BrainDumpCategory) => Promise<{ saved: number; failed: string[]; total: number } | void>;
  isLoading: boolean;
}

const FALLBACK_OPTIONS: { value: BrainDumpCategory; label: string; emoji: string }[] = [
  { value: 'note',     label: 'Note',     emoji: '📝' },
  { value: 'task',     label: 'Task',     emoji: '✅' },
  { value: 'idea',     label: 'Idea',     emoji: '💡' },
  { value: 'content',  label: 'Content',  emoji: '✍️' },
  { value: 'project',  label: 'Project',  emoji: '🚀' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'win',      label: 'Win',      emoji: '🏆' },
  { value: 'mindset',  label: 'Mindset',  emoji: '🧘' },
  { value: 'later',    label: 'Later',    emoji: '⏳' },
];

const QUICK_TAGS: { tag: string; emoji: string; label: string }[] = [
  { tag: 'task',     emoji: '✅', label: 'task' },
  { tag: 'idea',     emoji: '💡', label: 'idea' },
  { tag: 'content',  emoji: '✍️', label: 'content' },
  { tag: 'project',  emoji: '🚀', label: 'project' },
  { tag: 'question', emoji: '❓', label: 'question' },
  { tag: 'support',  emoji: '🆘', label: 'support' },
  { tag: 'win',      emoji: '🏆', label: 'win' },
  { tag: 'mindset',  emoji: '🧘', label: 'mindset' },
  { tag: 'later',    emoji: '⏳', label: 'later' },
];

const DRAFT_KEY = 'brain-dump-draft-v1';
const DRAFT_FALLBACK_KEY = 'brain-dump-draft-fallback-v1';

export function BrainDumpCreateForm({ onSubmitRaw, isLoading }: BrainDumpCreateFormProps) {
  const [text, setText] = useState<string>(() => {
    try { return localStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; }
  });
  const [fallback, setFallback] = useState<BrainDumpCategory>(() => {
    try { return (localStorage.getItem(DRAFT_FALLBACK_KEY) as BrainDumpCategory) || 'note'; } catch { return 'note'; }
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autosave draft
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        if (text) localStorage.setItem(DRAFT_KEY, text);
        else localStorage.removeItem(DRAFT_KEY);
        setSavedAt(Date.now());
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(handle);
  }, [text]);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_FALLBACK_KEY, fallback); } catch { /* ignore */ }
  }, [fallback]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    const res = await onSubmitRaw(text, fallback);
    if (res && res.failed.length > 0) {
      const remaining = res.failed.join('\n');
      setText(remaining);
      try { localStorage.setItem(DRAFT_KEY, remaining); } catch { /* ignore */ }
    } else {
      setText('');
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    }
  }, [text, fallback, onSubmitRaw]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertTag = (tag: string) => {
    const ta = textareaRef.current;
    const insertion = `#${tag} `;
    if (ta) {
      const start = ta.selectionStart ?? text.length;
      const end = ta.selectionEnd ?? text.length;
      const next = text.slice(0, start) + insertion + text.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + insertion.length;
        ta.setSelectionRange(pos, pos);
      });
    } else {
      setText(text + (text.endsWith(' ') || !text ? '' : ' ') + insertion);
    }
  };

  const lineCount = text.split('\n').filter(l => l.trim()).length;

  return (
    <div className={cn('rounded-xl border border-border/60 bg-card p-4 shadow-sm')}>
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          'Brain dump anything. One thought per line.\n' +
          'Examples:\n' +
          'Email Sarah about sales page #task #sales\n' +
          'New low-energy content batch idea #content\n' +
          'Why are launches so heavy? #question #support\n' +
          'Hit my best week ever #win'
        }
        className="min-h-[140px] text-base bg-background border-input focus-visible:ring-1 resize-none"
      />

      {/* Quick-tag chips for keyboard-light capture */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <span className="text-[11px] text-muted-foreground mr-1">Quick tag:</span>
        {QUICK_TAGS.map(qt => (
          <button
            key={qt.tag}
            type="button"
            onClick={() => insertTag(qt.tag)}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background hover:bg-muted px-2 py-0.5 text-[11px] transition-colors"
            aria-label={`Insert #${qt.tag}`}
          >
            <span>{qt.emoji}</span>
            <span>#{qt.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Hash className="h-3 w-3" />
          <span>Tag with #task, #idea, #content, #project, #question, #support, #win, #mindset, #later — or leave it messy.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">If untagged, save as</span>
          <Select value={fallback} onValueChange={(v) => setFallback(v as BrainDumpCategory)}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FALLBACK_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.emoji} {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Capture{lineCount > 1 ? ` ${lineCount} lines` : ''}
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>⌘/Ctrl + Enter to capture. Each line becomes its own item.</span>
        {text && savedAt && (
          <span className="inline-flex items-center gap-1">
            <Save className="h-3 w-3" />
            Draft saved
          </span>
        )}
      </div>
    </div>
  );
}
