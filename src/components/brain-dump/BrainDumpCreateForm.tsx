import { useState, useRef } from 'react';
import { Plus, Hash } from 'lucide-react';
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
  { value: 'note', label: 'Note', emoji: '📝' },
  { value: 'task', label: 'Task', emoji: '📋' },
  { value: 'idea', label: 'Idea', emoji: '💡' },
  { value: 'project', label: 'Project', emoji: '🚀' },
];

export function BrainDumpCreateForm({ onSubmitRaw, isLoading }: BrainDumpCreateFormProps) {
  const [text, setText] = useState('');
  const [fallback, setFallback] = useState<BrainDumpCategory>('note');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const res = await onSubmitRaw(text, fallback);
    // If hook reported failed lines, keep them; else clear.
    if (res && res.failed.length > 0) {
      setText(res.failed.join('\n'));
    } else {
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
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
          'Dump anything here. One thought per line.\n' +
          'Examples:\n' +
          'Email Sarah about sales page #task #sales\n' +
          'New low-energy content batch idea #idea #content\n' +
          'Potential project: simplify dashboard #project'
        }
        className="min-h-[140px] text-base bg-background border-input focus-visible:ring-1 resize-none"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Hash className="h-3 w-3" />
          <span>Tag with #task, #idea, #note, #project, #content, #question, #win — or leave it messy.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">If untagged, save as</span>
          <Select value={fallback} onValueChange={(v) => setFallback(v as BrainDumpCategory)}>
            <SelectTrigger className="w-[120px] h-8 text-sm bg-background">
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
      <p className="mt-2 text-[11px] text-muted-foreground">
        ⌘+Enter to capture. Each line becomes its own item.
      </p>
    </div>
  );
}
