import { Loader2, BookOpen, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCourseWeeklyProgress } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfWeek, getDay } from 'date-fns';

interface CourseProgress {
  id: string;
  title: string;
  planned: number;
  completed: number;
}

interface WeeklyProgressData {
  courses: CourseProgress[];
  total_planned: number;
  total_completed: number;
}

export function CourseProgressPanel() {
  const { data, isLoading, error } = useCourseWeeklyProgress();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const progressData = data as WeeklyProgressData | undefined;

  const handleRescheduleMissed = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Get overdue incomplete course sessions
      const { data: overdueTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('task_id, course_id')
        .eq('user_id', user.id)
        .eq('task_type', 'course_session')
        .neq('status', 'done')
        .lt('scheduled_date', todayStr);

      if (fetchError) throw fetchError;

      if (!overdueTasks || overdueTasks.length === 0) {
        toast.info('No missed sessions to reschedule');
        return;
      }

      // Move each to tomorrow
      const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd');
      
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ scheduled_date: tomorrow })
        .in('task_id', overdueTasks.map(t => t.task_id));

      if (updateError) throw updateError;

      toast.success(`Rescheduled ${overdueTasks.length} session(s) to tomorrow`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['course-weekly-progress'] });
    } catch (err: any) {
      toast.error('Failed to reschedule', { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !progressData) {
    return null;
  }

  if (progressData.courses.length === 0) {
    return null;
  }

  const missedCount = progressData.total_planned - progressData.total_completed;
  const overallPercent = progressData.total_planned > 0 
    ? Math.round((progressData.total_completed / progressData.total_planned) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Course Progress This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {progressData.total_completed} / {progressData.total_planned} sessions
            </span>
            <span className="font-medium">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} className="h-2" />
        </div>

        {/* Per-course breakdown */}
        <div className="space-y-2">
          {progressData.courses.map((course) => {
            const percent = course.planned > 0 
              ? Math.round((course.completed / course.planned) * 100) 
              : 0;
            const isBehind = course.completed < course.planned;

            return (
              <div key={course.id} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1 mr-2">{course.title}</span>
                <Badge 
                  variant={isBehind ? 'destructive' : 'secondary'}
                  className="shrink-0"
                >
                  {course.completed}/{course.planned}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Missed sessions alert */}
        {missedCount > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{missedCount} missed session{missedCount > 1 ? 's' : ''} this week</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleRescheduleMissed}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Reschedule Missed Sessions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
