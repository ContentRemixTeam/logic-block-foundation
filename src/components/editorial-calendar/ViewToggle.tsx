import { cn } from '@/lib/utils';
import { Palette, Send } from 'lucide-react';

interface ViewToggleProps {
  view: 'publish' | 'create';
  onViewChange: (view: 'publish' | 'create') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted/50 p-0.5 border border-border/40">
      <button
        onClick={() => onViewChange('publish')}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200",
          view === 'publish'
            ? "bg-card text-violet-600 dark:text-violet-400 shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Send className="h-3 w-3" />
        Publish
      </button>
      <button
        onClick={() => onViewChange('create')}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200",
          view === 'create'
            ? "bg-card text-teal-600 dark:text-teal-400 shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Palette className="h-3 w-3" />
        Create
      </button>
    </div>
  );
}
