import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { BookOpen, Calendar, Target, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CourseWithNextSession, CourseStatus } from '@/types/course';
import { COURSE_STATUS_LABELS } from '@/types/course';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: CourseWithNextSession;
}

const STATUS_COLORS: Record<CourseStatus, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  implementing: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  complete: 'bg-green-500/10 text-green-600 dark:text-green-400',
  archived: 'bg-muted text-muted-foreground',
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link to={`/courses/${course.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <h3 className="font-semibold text-foreground truncate">
                  {course.title}
                </h3>
              </div>
              
              {course.provider && (
                <p className="text-sm text-muted-foreground mb-2">
                  {course.provider}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge 
                  variant="secondary" 
                  className={cn('text-xs', STATUS_COLORS[course.status])}
                >
                  {COURSE_STATUS_LABELS[course.status]}
                </Badge>
                
                {course.roi_target && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    {course.roi_target}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{course.progress_percent}%</span>
                </div>
                <Progress value={course.progress_percent} className="h-2" />
              </div>

              {course.next_session_date && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Next: {format(new Date(course.next_session_date), 'MMM d')}
                  </span>
                </div>
              )}
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
