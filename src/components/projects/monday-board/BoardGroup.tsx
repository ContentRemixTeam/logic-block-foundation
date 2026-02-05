import { useState } from 'react';
import { Task } from '@/components/tasks/types';
import { ProjectSection, BOARD_COLUMNS, SECTION_COLORS } from '@/types/project';
import { BoardRow } from './BoardRow';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Pencil, Trash2, Palette, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { useProjectSectionMutations } from '@/hooks/useProjectSections';

interface BoardGroupProps {
  section: ProjectSection;
  tasks: Task[];
  visibleColumns: string[];
  projectId: string;
  onTaskClick: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (text: string) => void;
  onMoveToSection: (taskId: string, sectionId: string | null) => void;
  allSections: ProjectSection[];
  isUnsectioned?: boolean;
}

export function BoardGroup({
  section,
  tasks,
  visibleColumns,
  projectId,
  onTaskClick,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
  onMoveToSection,
  allSections,
  isUnsectioned = false,
}: BoardGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
   const [isCreating, setIsCreating] = useState(false);

  const { updateSection, deleteSection, reorderSections } = useProjectSectionMutations(projectId);

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleSaveName = () => {
    if (editName.trim() && editName !== section.name) {
      updateSection.mutate({ id: section.id, name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleColorChange = (color: string) => {
    updateSection.mutate({ id: section.id, color });
  };

  const handleDelete = () => {
    if (confirm(`Delete "${section.name}" group? Tasks will be moved to Uncategorized.`)) {
      deleteSection.mutate(section.id);
    }
  };

  const handleAddTask = () => {
     if (newTaskText.trim() && !isCreating) {
       setIsCreating(true);
      onCreateTask(newTaskText.trim());
      setNewTaskText('');
      setIsAddingTask(false);
       // Delay clearing to allow real-time to catch up
       setTimeout(() => setIsCreating(false), 500);
    }
  };

  return (
    <div className="border-b">
      {/* Group Header */}
      <div 
        className="group flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 cursor-pointer"
        style={{ borderLeft: `4px solid ${section.color}` }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="h-7 w-48"
            autoFocus
          />
        ) : (
          <span 
            className="font-medium text-sm cursor-pointer"
            onClick={() => !isUnsectioned && setIsEditing(true)}
          >
            {section.name}
          </span>
        )}

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
          className="h-6 text-xs opacity-0 group-hover:opacity-100 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingTask(true);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add task
        </Button>

        {!isUnsectioned && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="h-4 w-4 mr-2" />
                  Change color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="grid grid-cols-5 gap-1 p-2">
                    {SECTION_COLORS.map(color => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/50 transition-colors"
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorChange(color)}
                      />
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tasks */}
      {!isCollapsed && (
        <div>
          {tasks.map(task => (
            <BoardRow
              key={task.task_id}
              task={task}
              visibleColumns={visibleColumns}
              onClick={() => onTaskClick(task)}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onMoveToSection={onMoveToSection}
              allSections={allSections}
              currentSectionId={isUnsectioned ? null : section.id}
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
               <Button 
                 size="sm" 
                 className="h-7" 
                 onClick={handleAddTask}
                 disabled={isCreating || !newTaskText.trim()}
               >
                 {isCreating ? 'Adding...' : 'Add'}
               </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => { setIsAddingTask(false); setNewTaskText(''); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/30 flex items-center gap-2 border-t"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          )}

          {/* Empty state */}
          {tasks.length === 0 && !isAddingTask && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Add your first task to this group
            </div>
          )}
        </div>
      )}
    </div>
  );
}
