import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '@/components/tasks/types';
import { TaskBoardCard } from './TaskBoardCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskBoardColumnProps {
  id: string;
  title: string;
  icon: string;
  tasks: Task[];
  color?: string;
  onAddTask: (columnId: string, text: string) => void;
  onToggleTask: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onRescheduleTask?: (task: Task) => void;
}

export function TaskBoardColumn({
  id,
  title,
  icon,
  tasks,
  color,
  onAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onRescheduleTask,
}: TaskBoardColumnProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      columnId: id,
    }
  });

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    onAddTask(id, newTaskText.trim());
    setNewTaskText('');
    setIsAddingTask(false);
  };

  const taskIds = tasks.map(t => t.task_id);

  return (
    <div className="flex flex-col min-w-[300px] max-w-[350px] h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div 
            className="w-1 h-5 rounded-full"
            style={{ backgroundColor: color || '#94A3B8' }}
          />
          <span className="text-lg">{icon}</span>
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsAddingTask(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Column Content */}
      <div 
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-lg p-2 space-y-2 overflow-y-auto transition-colors',
          'bg-muted/30 border-2 border-dashed border-transparent',
          isOver && 'border-primary/50 bg-primary/5'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskBoardCard
              key={task.task_id}
              task={task}
              onToggle={onToggleTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onReschedule={onRescheduleTask}
            />
          ))}
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && !isAddingTask && (
          <div 
            className={cn(
              'flex flex-col items-center justify-center py-8 text-center',
              'border-2 border-dashed rounded-lg',
              isOver ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20'
            )}
          >
            <p className="text-sm text-muted-foreground">
              {isOver ? 'Drop here' : 'No tasks'}
            </p>
            {!isOver && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setIsAddingTask(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add task
              </Button>
            )}
          </div>
        )}

        {/* Quick Add Form */}
        {isAddingTask && (
          <div className="bg-card border rounded-lg p-3 space-y-2">
            <Input
              autoFocus
              placeholder="Task name..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') {
                  setNewTaskText('');
                  setIsAddingTask(false);
                }
              }}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAddTask} disabled={!newTaskText.trim()}>
                Add
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setNewTaskText('');
                  setIsAddingTask(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Persistent Quick Add (when not empty and not in adding mode) */}
        {tasks.length > 0 && !isAddingTask && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        )}
      </div>
    </div>
  );
}
