import { useState } from 'react';
import { Task } from '@/components/tasks/types';
import { BOARD_COLUMNS } from '@/types/project';
import { TaskBoardRow } from './TaskBoardRow';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface TaskBoardGroupProps {
  groupId: string;
  groupName: string;
  groupColor: string;
  tasks: Task[];
  visibleColumns: string[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (text: string) => void;
}

export function TaskBoardGroup({
  groupId,
  groupName,
  groupColor,
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
    if (newTaskText.trim()) {
      onCreateTask(newTaskText.trim());
      setNewTaskText('');
      setIsAddingTask(false);
    }
  };

  return (
    <div className="border-b last:border-b-0">
      {/* Group Header */}
      <div 
        className="flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 cursor-pointer group"
        style={{ borderLeft: `4px solid ${groupColor}` }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <span className="font-medium text-sm">{groupName}</span>

        <span className="text-xs text-muted-foreground ml-2">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>

        {tasks.length > 0 && (
          <div className="flex items-center gap-2 ml-4">
            <Progress value={progress} className="w-24 h-1.5" />
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingTask(true);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add task
        </Button>
      </div>

      {/* Tasks */}
      {!isCollapsed && (
        <div>
          {tasks.map(task => (
            <TaskBoardRow
              key={task.task_id}
              task={task}
              visibleColumns={visibleColumns}
              onClick={() => onTaskClick(task)}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
            />
          ))}

          {/* Quick add row */}
          {isAddingTask ? (
            <div className="flex items-center px-3 py-2 border-t bg-muted/10">
              <div className="w-6" />
              <Input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Task name..."
                className="flex-1 h-8 border-0 bg-transparent focus-visible:ring-0 shadow-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') {
                    setIsAddingTask(false);
                    setNewTaskText('');
                  }
                }}
                autoFocus
              />
              <Button size="sm" className="h-7" onClick={handleAddTask}>Add</Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => { setIsAddingTask(false); setNewTaskText(''); }}>
                Cancel
              </Button>
            </div>
          ) : tasks.length > 0 ? (
            <button
              className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/30 flex items-center gap-2 border-t"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          ) : null}

          {/* Empty state */}
          {tasks.length === 0 && !isAddingTask && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              <button
                className="hover:text-foreground flex items-center gap-2 mx-auto"
                onClick={() => setIsAddingTask(true)}
              >
                <Plus className="h-4 w-4" />
                Add your first task
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}