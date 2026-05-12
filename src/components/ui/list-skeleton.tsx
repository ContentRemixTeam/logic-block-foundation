import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  rows?: number;
  className?: string;
  variant?: "list" | "cards" | "board";
}

/**
 * Drop-in skeleton for hot pages so we never spinner-flash.
 * Matches calm-editorial spacing rhythm.
 */
export function ListSkeleton({
  rows = 5,
  className,
  variant = "list",
}: ListSkeletonProps) {
  if (variant === "cards") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-5 space-y-3"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "board") {
    return (
      <div className={cn("grid gap-4 md:grid-cols-3", className)}>
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3"
        >
          <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
          <Skeleton className="h-3 flex-1" style={{ maxWidth: `${60 + (i % 3) * 15}%` }} />
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
