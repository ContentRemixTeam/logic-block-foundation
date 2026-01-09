import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';

interface BoardCardProps {
  project: Project;
  onClick: () => void;
  isDragging?: boolean;
}

export function BoardCard({ project, onClick, isDragging: externalDragging }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: { type: 'project', project },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = project.end_date && isPast(new Date(project.end_date)) && !isToday(new Date(project.end_date));
  const isDueToday = project.end_date && isToday(new Date(project.end_date));

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow group',
        (isDragging || externalDragging) && 'opacity-50 shadow-lg rotate-2'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab hover:bg-accent rounded p-0.5 -ml-1 mt-0.5 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Project Color Indicator & Name */}
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="font-medium text-sm truncate">{project.name}</span>
          </div>

          {/* Description preview */}
          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {project.description}
            </p>
          )}

          {/* Footer info */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Due date */}
            {project.end_date && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue && 'text-destructive',
                  isDueToday && 'text-warning'
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>
                  {isDueToday
                    ? 'Today'
                    : format(new Date(project.end_date), 'MMM d')}
                </span>
              </div>
            )}

            {/* Status badge */}
            <Badge
              variant="outline"
              className={cn(
                'text-xs h-5',
                project.status === 'active' && 'border-primary/50 text-primary',
                project.status === 'completed' && 'border-success/50 text-success',
                project.status === 'archived' && 'border-muted-foreground/50'
              )}
            >
              {project.status}
            </Badge>

            {/* Task count */}
            {project.task_count !== undefined && project.task_count > 0 && (
              <span className="text-xs text-muted-foreground">
                {project.task_count} tasks
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
