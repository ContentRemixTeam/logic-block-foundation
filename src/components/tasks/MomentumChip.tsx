import { MOMENTUM_BY_VALUE, getMomentumMeta, MOMENTUM_TYPES, type MomentumType } from '@/lib/momentumTypes';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';

interface MomentumChipProps {
  value: MomentumType | null | undefined;
  onChange?: (next: MomentumType | null) => void;
  size?: 'sm' | 'xs';
  /** When true, render as a static badge (no menu) */
  readOnly?: boolean;
  /** When no value is set, show a subtle "+ tag" placeholder if onChange is provided */
  showPlaceholder?: boolean;
  className?: string;
}

/**
 * Compact chip showing a task's momentum classification.
 * Click to change. Reuses semantic tokens for theming.
 */
export function MomentumChip({
  value,
  onChange,
  size = 'sm',
  readOnly,
  showPlaceholder = false,
  className,
}: MomentumChipProps) {
  const meta = getMomentumMeta(value);
  const sizeClass = size === 'xs' ? 'h-4 px-1 text-[10px]' : 'h-5 px-1.5 text-xs';

  if (readOnly || !onChange) {
    if (!meta) return null;
    return (
      <Badge
        variant="outline"
        className={cn(sizeClass, 'gap-0.5 border', meta.badgeClass, className)}
        title={meta.description}
      >
        <span aria-hidden>{meta.emoji}</span>
        <span className="hidden sm:inline">{meta.label}</span>
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center gap-0.5 rounded-md border transition-colors',
            sizeClass,
            meta
              ? meta.badgeClass
              : 'border-dashed border-border text-muted-foreground hover:bg-muted/50',
            className,
          )}
          title={meta?.description ?? 'Tag this task with a momentum type'}
        >
          {meta ? (
            <>
              <span aria-hidden>{meta.emoji}</span>
              <span className="hidden sm:inline">{meta.label}</span>
            </>
          ) : showPlaceholder ? (
            <>
              <Compass className="h-3 w-3" />
              <span className="hidden sm:inline">Tag</span>
            </>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56"
        onClick={(e) => e.stopPropagation()}
      >
        {MOMENTUM_TYPES.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onClick={() => onChange(m.value)}
            className="gap-2"
          >
            <span className="text-base leading-none">{m.emoji}</span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-[11px] text-muted-foreground">{m.description}</span>
            </span>
            {value === m.value && <span className="text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
        {value && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(null)} className="text-muted-foreground">
              Clear momentum tag
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { MOMENTUM_BY_VALUE };
