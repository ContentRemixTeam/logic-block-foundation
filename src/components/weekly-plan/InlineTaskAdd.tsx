import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineTaskAddProps {
  onAdd: (text: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export function InlineTaskAdd({ onAdd, placeholder = 'Add task...', className }: InlineTaskAddProps) {
  const [text, setText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || isAdding) return;
    
    setIsAdding(true);
    try {
      await onAdd(text.trim());
      setText('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setText('');
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md transition-all",
        isFocused ? "bg-card border shadow-sm" : "hover:bg-muted/50",
        className
      )}
    >
      {isAdding ? (
        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
      ) : (
        <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={isAdding}
        className={cn(
          "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60",
          isAdding && "opacity-50"
        )}
      />
    </div>
  );
}
