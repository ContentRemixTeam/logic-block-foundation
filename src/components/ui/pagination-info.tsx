import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationInfoProps {
  /** Number of items currently shown */
  shownCount: number;
  /** Total count from server */
  totalCount: number;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether "load more" is in progress */
  isLoadingMore: boolean;
  /** Load the next page of items */
  onLoadMore: () => void;
  /** Custom class name */
  className?: string;
  /** Item label (e.g., "tasks", "ideas") */
  itemLabel?: string;
}

export function PaginationInfo({
  shownCount,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  className,
  itemLabel = 'items',
}: PaginationInfoProps) {
  if (totalCount === 0) return null;

  const startIndex = shownCount > 0 ? 1 : 0;
  const endIndex = shownCount;

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 py-4', className)}>
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{startIndex}-{endIndex}</span>{' '}
        of <span className="font-medium text-foreground">{totalCount}</span> {itemLabel}
      </p>
      
      {hasMore && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="min-w-[140px]"
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            `Load More ${itemLabel}`
          )}
        </Button>
      )}
      
      {!hasMore && shownCount < totalCount && (
        <p className="text-sm text-muted-foreground">All {itemLabel} loaded</p>
      )}
    </div>
  );
}

export interface SimplePaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Custom class name */
  className?: string;
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: SimplePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      
      <span className="text-sm text-muted-foreground px-4">
        Page {currentPage} of {totalPages}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}
