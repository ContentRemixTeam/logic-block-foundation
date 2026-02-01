import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface LaunchTasksTodayProps {
  projectId: string;
}

interface Task {
  task_id: string;
  task_text: string;
  status: string;
  priority: string | null;
  scheduled_date: string | null;
}

export function LaunchTasksToday({ projectId }: LaunchTasksTodayProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['launch-tasks-today', user?.id, projectId, today],
    queryFn: async (): Promise<Task[]> => {
      if (!user?.id || !projectId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('task_id, task_text, status, priority, scheduled_date')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('scheduled_date', today)
        .neq('status', 'done')
        .order('priority', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!projectId,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'done',
          completed_at: new Date().toISOString()
        })
        .eq('task_id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-tasks-today'] });
      queryClient.invalidateQueries({ queryKey: ['active-launches-detailed'] });
    },
  });

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Loading tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2 text-center">
        No launch tasks scheduled for today
      </div>
    );
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-1.5">
      {tasks.map((task) => (
        <div 
          key={task.task_id}
          className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors group"
        >
          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={() => toggleMutation.mutate(task.task_id)}
            className="data-[state=checked]:bg-green-500"
          />
          <span className={cn(
            "flex-1 text-sm",
            task.status === 'done' && "line-through text-muted-foreground"
          )}>
            {task.task_text}
          </span>
          {task.priority && task.priority !== 'normal' && (
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1.5", getPriorityColor(task.priority))}
            >
              {task.priority}
            </Badge>
          )}
        </div>
      ))}
      
      <Link 
        to={`/projects/${projectId}`}
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
      >
        View all tasks <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
