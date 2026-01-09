import { useMemo, useState } from 'react';
import { Task } from '@/components/tasks/types';
import { useTaskMutations } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical } from 'lucide-react';
import { PROJECT_COLUMN_CONFIG, ProjectColumn } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectKanbanBoardProps {
  tasks: Task[];
  projectId: string;
  onTaskToggle: (taskId: string) => void;
  onUpdateColumn: (taskId: string, column: ProjectColumn) => void;
}

export function ProjectKanbanBoard({
  tasks,
  projectId,
  onTaskToggle,
  onUpdateColumn,
}: ProjectKanbanBoardProps) {
  const { createTask } = useTaskMutations();
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({
    todo: '',
    in_progress: '',
    done: '',
  });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<ProjectColumn, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    tasks.forEach(task => {
      const column = (task.project_column || 'todo') as ProjectColumn;
      if (grouped[column]) {
        grouped[column].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleAddTask = (column: ProjectColumn) => {
    const text = newTaskText[column]?.trim();
    if (!text) return;

    createTask.mutate({
      task_text: text,
      project_id: projectId,
      project_column: column,
    });

    setNewTaskText(prev => ({ ...prev, [column]: '' }));
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumn: ProjectColumn) => {
    e.preventDefault();
    
    if (draggedTaskId) {
      const task = tasks.find(t => t.task_id === draggedTaskId);
      if (task && task.project_column !== targetColumn) {
        onUpdateColumn(draggedTaskId, targetColumn);
      }
    }
    
    setDraggedTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  return (
    <div className="flex gap-4 p-4 h-full min-h-0">
      {PROJECT_COLUMN_CONFIG.map(({ value: column, label, icon }) => (
        <div
          key={column}
          className="flex-1 flex flex-col min-w-[280px] max-w-[400px]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column)}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <h3 className="font-semibold">{label}</h3>
              <Badge variant="secondary" className="ml-1">
                {tasksByColumn[column].length}
              </Badge>
            </div>
          </div>

          {/* Column Content */}
          <div className="flex-1 bg-muted/30 rounded-lg p-2 space-y-2 overflow-auto">
            {/* Tasks */}
            {tasksByColumn[column].map(task => (
              <div
                key={task.task_id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.task_id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'bg-background border rounded-lg p-3 cursor-grab active:cursor-grabbing group',
                  'hover:shadow-sm transition-shadow',
                  draggedTaskId === task.task_id && 'opacity-50'
                )}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
                  
                  <Checkbox
                    checked={task.is_completed}
                    onCheckedChange={() => onTaskToggle(task.task_id)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm',
                      task.is_completed && 'line-through text-muted-foreground'
                    )}>
                      {task.task_text}
                    </p>
                    
                    {/* Task metadata */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.priority && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            task.priority === 'high' && 'border-destructive/50 text-destructive',
                            task.priority === 'medium' && 'border-yellow-500/50 text-yellow-600',
                            task.priority === 'low' && 'border-green-500/50 text-green-600'
                          )}
                        >
                          {task.priority}
                        </Badge>
                      )}
                      {task.scheduled_date && (
                        <Badge variant="secondary" className="text-xs">
                          {new Date(task.scheduled_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {tasksByColumn[column].length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tasks
              </div>
            )}

            {/* Quick add */}
            <div className="pt-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a task..."
                  value={newTaskText[column]}
                  onChange={(e) => setNewTaskText(prev => ({ 
                    ...prev, 
                    [column]: e.target.value 
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTask(column);
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAddTask(column)}
                  disabled={!newTaskText[column]?.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
