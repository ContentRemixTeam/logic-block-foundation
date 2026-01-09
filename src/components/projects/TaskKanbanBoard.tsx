import { useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task } from '@/components/tasks/types';
import { useTaskMutations } from '@/hooks/useTasks';
import { TaskBoardColumn } from './TaskBoardColumn';
import { TaskBoardCard } from './TaskBoardCard';
import { PROJECT_COLUMN_CONFIG, ProjectColumn } from '@/types/project';
import { cn } from '@/lib/utils';

interface TaskKanbanBoardProps {
  tasks: Task[];
  projectId: string;
  onTaskToggle: (taskId: string) => void;
  onUpdateColumn: (taskId: string, column: ProjectColumn) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

const COLUMN_COLORS: Record<ProjectColumn, string> = {
  todo: '#94A3B8',
  in_progress: '#F59E0B',
  done: '#10B981',
};

export function TaskKanbanBoard({
  tasks,
  projectId,
  onTaskToggle,
  onUpdateColumn,
  onEditTask,
  onDeleteTask,
}: TaskKanbanBoardProps) {
  const { createTask } = useTaskMutations();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

    // Sort by position or created date
    Object.keys(grouped).forEach(col => {
      grouped[col as ProjectColumn].sort((a, b) => {
        if (a.position_in_column !== null && b.position_in_column !== null) {
          return a.position_in_column - b.position_in_column;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    });

    return grouped;
  }, [tasks]);

  const handleAddTask = useCallback((columnId: string, text: string) => {
    createTask.mutate({
      task_text: text,
      project_id: projectId,
      project_column: columnId as ProjectColumn,
    });
  }, [createTask, projectId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.task_id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback (optional)
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.task_id === active.id);
    if (!activeTask) return;

    // Determine target column
    let targetColumn: ProjectColumn | null = null;

    // Check if dropped on a column
    if (over.data.current?.type === 'column') {
      targetColumn = over.data.current.columnId as ProjectColumn;
    }
    // Check if dropped on another task
    else if (over.data.current?.type === 'task') {
      const overTask = tasks.find(t => t.task_id === over.id);
      if (overTask) {
        targetColumn = (overTask.project_column || 'todo') as ProjectColumn;
      }
    }
    // Check if dropped on a column droppable
    else if (typeof over.id === 'string' && ['todo', 'in_progress', 'done'].includes(over.id)) {
      targetColumn = over.id as ProjectColumn;
    }

    if (targetColumn && activeTask.project_column !== targetColumn) {
      onUpdateColumn(activeTask.task_id, targetColumn);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 h-full min-h-0 overflow-x-auto">
        {PROJECT_COLUMN_CONFIG.map(({ value: column, label, icon }) => (
          <TaskBoardColumn
            key={column}
            id={column}
            title={label}
            icon={icon}
            color={COLUMN_COLORS[column]}
            tasks={tasksByColumn[column]}
            onAddTask={handleAddTask}
            onToggleTask={onTaskToggle}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="rotate-3 scale-105">
            <TaskBoardCard
              task={activeTask}
              onToggle={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
