import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { GripVertical, MoreHorizontal, Pencil, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BoardCard } from './BoardCard';
import { BoardColumn as BoardColumnType, Project, COLUMN_COLORS } from '@/types/project';
import { cn } from '@/lib/utils';

interface BoardColumnComponentProps {
  column: BoardColumnType;
  projects: Project[];
  onAddProject: () => void;
  onProjectClick: (project: Project) => void;
  onUpdateColumn: (updates: { name?: string; color?: string }) => void;
  onDeleteColumn: () => void;
}

export function BoardColumnComponent({
  column,
  projects,
  onAddProject,
  onProjectClick,
  onUpdateColumn,
  onDeleteColumn,
}: BoardColumnComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== column.name) {
      onUpdateColumn({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <>
      <div
        ref={(node) => {
          setSortableRef(node);
          setDroppableRef(node);
        }}
        style={style}
        className={cn(
          'w-72 shrink-0 flex flex-col bg-muted/50 rounded-lg border',
          isDragging && 'opacity-50',
          isOver && 'ring-2 ring-primary'
        )}
      >
        {/* Column Header */}
        <div
          className="p-3 border-b flex items-center gap-2"
          style={{ borderTopColor: column.color, borderTopWidth: 3 }}
        >
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:bg-accent rounded p-1 -ml-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditName(column.name);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm font-medium"
              autoFocus
            />
          ) : (
            <span
              className="font-medium text-sm flex-1 cursor-pointer hover:text-primary"
              onClick={() => setIsEditing(true)}
            >
              {column.name}
            </span>
          )}

          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
            {projects.length}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Name
              </DropdownMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Palette className="h-4 w-4 mr-2" />
                    Change Color
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent className="w-64" side="right">
                  <div className="grid grid-cols-6 gap-2">
                    {COLUMN_COLORS.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform',
                          column.color === color && 'ring-2 ring-primary ring-offset-2'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => onUpdateColumn({ color })}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Column Body */}
        <div className="flex-1 p-2 overflow-y-auto min-h-[200px]">
          <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {projects.length === 0 ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground text-sm p-4">
                Drop projects here
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <BoardCard
                    key={project.id}
                    project={project}
                    onClick={() => onProjectClick(project)}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </div>

        {/* Add Project Button */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={onAddProject}
          >
            + Add project
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{column.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {projects.length > 0
                ? `${projects.length} project(s) will be moved to the first column.`
                : 'This column has no projects.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteColumn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
