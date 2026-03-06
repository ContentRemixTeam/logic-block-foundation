import { useState, useRef, useEffect } from 'react';
import { Plus, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_CONFIG, type BrainDumpCategory } from '@/hooks/useBrainDump';
import { cn } from '@/lib/utils';

interface BrainDumpCreateFormProps {
  onSubmit: (text: string, category: BrainDumpCategory) => void;
  isLoading: boolean;
}

const HASHTAG_MAP: Record<string, BrainDumpCategory> = {
  '#note': 'note',
  '#idea': 'idea',
  '#task': 'task',
  '#project': 'project',
};

export function BrainDumpCreateForm({ onSubmit, isLoading }: BrainDumpCreateFormProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<BrainDumpCategory>('note');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-detect hashtags
  useEffect(() => {
    const lower = text.toLowerCase();
    for (const [tag, cat] of Object.entries(HASHTAG_MAP)) {
      if (lower.includes(tag)) {
        setCategory(cat);
        break;
      }
    }
  }, [text]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    // Strip hashtags from text
    let cleanText = text;
    Object.keys(HASHTAG_MAP).forEach(tag => {
      cleanText = cleanText.replace(new RegExp(tag, 'gi'), '').trim();
    });
    onSubmit(cleanText || text.trim(), category);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const config = CATEGORY_CONFIG[category];

  return (
    <div className={cn(
      'rounded-xl border-2 p-4 transition-colors',
      config.bgClass, config.borderClass
    )}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{config.emoji}</span>
        <Select value={category} onValueChange={(v) => setCategory(v as BrainDumpCategory)}>
          <SelectTrigger className="w-[140px] h-8 text-sm bg-background/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(CATEGORY_CONFIG) as [BrainDumpCategory, typeof config][]).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.emoji} {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Type #task, #idea, #note, or #project
        </span>
      </div>

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind? Type freely..."
        className="min-h-[80px] text-base bg-background/40 border-0 focus-visible:ring-1 resize-none"
      />

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">
          ⌘+Enter to save
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add {config.label.slice(0, -1)}
        </Button>
      </div>
    </div>
  );
}
