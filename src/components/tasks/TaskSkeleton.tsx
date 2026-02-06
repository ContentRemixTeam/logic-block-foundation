import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TaskSkeletonProps {
  className?: string;
}

export function TaskSkeleton({ className }: TaskSkeletonProps) {
  return (
    <div className={cn("flex items-start gap-3 p-4 bg-card rounded-lg border", className)}>
      {/* Checkbox skeleton */}
      <Skeleton className="h-5 w-5 rounded-md flex-shrink-0 mt-0.5" />
      
      {/* Content area */}
      <div className="flex-1 space-y-2">
        {/* Task title */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* Meta info (project, due date, etc.) */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      
      {/* Action buttons area */}
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

interface TaskListSkeletonProps {
  count?: number;
  className?: string;
}

export function TaskListSkeleton({ count = 5, className }: TaskListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Group header skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      
      {/* Task skeletons */}
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </div>
  );
}

interface LoadingMoreSkeletonProps {
  count?: number;
}

export function LoadingMoreSkeleton({ count = 3 }: LoadingMoreSkeletonProps) {
  return (
    <div className="space-y-2 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} className="opacity-60" />
      ))}
    </div>
  );
}
