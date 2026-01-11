import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Task } from '@/components/tasks/types';
import { TaskBoardRow } from './TaskBoardRow';
import { cn } from '@/lib/utils';

interface TaskBoardGroupProps {
  group: {
    id: string;
    name: string;
    color?: string;
  };
  tasks: Task[];
  visibleColumns: string[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (task: Task) => void;
  onCreateTask?: (groupId: string, taskText: string) => void;
}

export function TaskBoardGroup({
  group,
  tasks,
  visibleColumns,
  onTaskClick,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
}: TaskBoardGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleAddTask = () => {
    if (newTaskText.trim() && onCreateTask) {
      onCreateTask(group.id, newTaskText.trim());
      setNewTaskText('');
      setIsAddingTask(false);
    }
  };

  const groupColor = group.color || '#6366f1';

  return (
    <div className="mb-4">
      {/* Group Header */}
      <div 
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg",
          "bg-muted/30 hover:bg-muted/50 transition-colors",
          "border border-border/40",
          "group cursor-pointer"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {/* Color indicator */}
        <div 
          className="w-1 h-6 rounded-full shadow-sm"
          style={{ backgroundColor: groupColor }}
        />
        
        {/* Expand/collapse */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* Group name */}
        <span className="font-medium text-sm flex-1">{group.name}</span>

        {/* Task count */}
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedCount}/{tasks.length}
        </span>

        {/* Progress bar */}
        <div className="w-20">
          <Progress 
            value={progress} 
            className="h-1.5"
          />
        </div>

        {/* Add button */}
        {onCreateTask && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1 text-xs",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingTask(true);
            }}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>

      {/* Tasks */}
      {!isCollapsed && (
        <div className="mt-1 space-y-px">
          {tasks.map((task, index) => (
            <div
              key={task.task_id}
              className={cn(
                index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
              )}
            >
              <TaskBoardRow
                task={task}
                visibleColumns={visibleColumns}
                onTaskClick={onTaskClick}
                onToggleComplete={onToggleComplete}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            </div>
          ))}

          {/* Add task inline */}
          {isAddingTask && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-lg border border-dashed border-border">
              <Input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Enter task name..."
                className="h-8 text-sm flex-1 bg-background"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') {
                    setIsAddingTask(false);
                    setNewTaskText('');
                  }
                }}
              />
              <Button size="sm" className="h-8" onClick={handleAddTask}>
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskText('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && !isAddingTask && (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">No tasks in this group</p>
              {onCreateTask && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsAddingTask(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add task
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}