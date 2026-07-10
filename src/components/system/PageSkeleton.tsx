import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** A shared skeleton for a card-shaped loading placeholder. */
export function CardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card p-4 space-y-3',
        className,
      )}
      aria-hidden
    >
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Full-page skeleton — a header shim + a stack of card skeletons. */
export function PageSkeleton({ cards = 3, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6', className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
