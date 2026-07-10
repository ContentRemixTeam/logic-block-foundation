/**
 * Tiny inline "learn this once" hint. Persistently dismissable per key.
 * Warm, calm, one sentence, one tap to hide forever.
 */
import { X, Lightbulb } from 'lucide-react';
import { useOnceHint } from '@/hooks/useOnceHint';
import { cn } from '@/lib/utils';

interface Props {
  hintKey: string;
  children: React.ReactNode;
  className?: string;
}

export function OnceHint({ hintKey, children, className }: Props) {
  const { seen, dismiss } = useOnceHint(hintKey);
  if (seen) return null;
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs text-foreground/80',
        className,
      )}
    >
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
      <p className="flex-1 leading-relaxed">{children}</p>
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Got it, hide this hint"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
