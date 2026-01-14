import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, LayoutGrid, List, ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BoardColumnComponent } from './BoardColumn';
import { BoardCard } from './BoardCard';
import { CreateBoardModal } from './CreateBoardModal';
import { CreateColumnForm } from './CreateColumnForm';
import { NewProjectModal } from './NewProjectModal';
import {
  useProjectBoards,
  useBoardColumns,
  useBoardProjects,
  useBoardMutations,
  useColumnMutations,
  useProjectBoardMutations,
} from '@/hooks/useProjectBoards';
import { Project, BoardColumn } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectBoardViewProps {
  onSwitchToList: () => void;
}

export function ProjectBoardView({ onSwitchToList }: ProjectBoardViewProps) {
  const navigate = useNavigate();
  const { data: boards, isLoading: boardsLoading } = useProjectBoards();
  const { createDefaultBoard } = useBoardMutations();

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectColumnId, setNewProjectColumnId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null);

  const { data: columns, isLoading: columnsLoading } = useBoardColumns(selectedBoardId);
  const { data: projects, isLoading: projectsLoading } = useBoardProjects(selectedBoardId);
  const columnMutations = useColumnMutations(selectedBoardId || '');
  const projectMutations = useProjectBoardMutations(selectedBoardId || '');

  // Initialize default board if needed
  useEffect(() => {
    if (!boardsLoading && boards && boards.length === 0) {
      createDefaultBoard.mutate();
    } else if (!boardsLoading && boards && boards.length > 0 && !selectedBoardId) {
      const defaultBoard = boards.find((b) => b.is_default) || boards[0];
      setSelectedBoardId(defaultBoard.id);
    }
  }, [boards, boardsLoading, selectedBoardId]);

  const selectedBoard = boards?.find((b) => b.id === selectedBoardId);

  // Group projects by column
  const projectsByColumn = useMemo(() => {
    if (!projects || !columns) return new Map<string, Project[]>();

    const map = new Map<string, Project[]>();
    columns.forEach((col) => map.set(col.id, []));

    projects.forEach((project) => {
      const colId = project.column_id;
      if (colId && map.has(colId)) {
        map.get(colId)!.push(project);
      } else if (columns.length > 0) {
        // Put in first column if no column assigned
        const firstCol = columns[0];
        map.get(firstCol.id)?.push(project);
      }
    });

    // Sort projects in each column by board_sort_order
    map.forEach((projectList) => {
      projectList.sort((a, b) => (a.board_sort_order || 0) - (b.board_sort_order || 0));
    });

    return map;
  }, [projects, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === 'project') {
      setActiveProject(active.data.current?.project);
    } else if (type === 'column') {
      setActiveColumn(active.data.current?.column);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for potential visual feedback
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    setActiveColumn(null);

    if (!over) return;

    const activeType = active.data.current?.type;

    if (activeType === 'column' && columns) {
      const activeColIndex = columns.findIndex((c) => c.id === active.id);
      const overColIndex = columns.findIndex((c) => c.id === over.id);

      if (activeColIndex !== overColIndex && activeColIndex !== -1 && overColIndex !== -1) {
        const newColumns = arrayMove(columns, activeColIndex, overColIndex);
        const updates = newColumns.map((col, idx) => ({ id: col.id, sort_order: idx }));
        columnMutations.reorderColumns.mutate(updates);
      }
    } else if (activeType === 'project') {
      const projectId = active.id as string;
      const overType = over.data.current?.type;

      let targetColumnId: string | null = null;

      if (overType === 'column') {
        targetColumnId = over.id as string;
      } else if (overType === 'project') {
        targetColumnId = over.data.current?.project?.column_id;
      }

      if (targetColumnId) {
        const currentProjects = projectsByColumn.get(targetColumnId) || [];
        const overProjectIndex = currentProjects.findIndex((p) => p.id === over.id);
        const sortOrder = overProjectIndex >= 0 ? overProjectIndex : currentProjects.length;

        projectMutations.moveProject.mutate({
          projectId,
          columnId: targetColumnId,
          sortOrder,
        });
      }
    }
  };

  const handleAddProjectToColumn = (columnId: string) => {
    setNewProjectColumnId(columnId);
    setIsNewProjectOpen(true);
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading boards...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Board Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                {selectedBoard?.name || 'Select Board'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {boards?.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  className={cn(board.id === selectedBoardId && 'bg-accent')}
                >
                  {board.name}
                  {board.is_default && (
                    <span className="ml-auto text-xs text-muted-foreground">Default</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCreateBoardOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border rounded-lg">
            <Button variant="ghost" size="sm" onClick={onSwitchToList} className="rounded-r-none">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" className="rounded-l-none">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => setIsNewProjectOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Board Content */}
      {columnsLoading || projectsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading board...</div>
        </div>
      ) : !columns || columns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No columns yet</h3>
          <p className="text-muted-foreground mb-4">Add columns to organize your projects</p>
          <Button onClick={() => setIsCreateColumnOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 h-full min-w-max">
              <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                {columns.map((column) => (
                  <BoardColumnComponent
                    key={column.id}
                    column={column}
                    projects={projectsByColumn.get(column.id) || []}
                    onAddProject={() => handleAddProjectToColumn(column.id)}
                    onProjectClick={handleProjectClick}
                    onUpdateColumn={(updates) => columnMutations.updateColumn.mutate({ id: column.id, ...updates })}
                    onDeleteColumn={() => columnMutations.deleteColumn.mutate(column.id)}
                  />
                ))}
              </SortableContext>

              {/* Add Column Button */}
              {isCreateColumnOpen ? (
                <CreateColumnForm
                  onSubmit={(name, color) => {
                    columnMutations.createColumn.mutate({ name, color });
                    setIsCreateColumnOpen(false);
                  }}
                  onCancel={() => setIsCreateColumnOpen(false)}
                  isSubmitting={columnMutations.createColumn.isPending}
                />
              ) : (
                <Button
                  variant="outline"
                  className="h-12 w-64 shrink-0 border-dashed"
                  onClick={() => setIsCreateColumnOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeProject && (
              <BoardCard project={activeProject} isDragging onClick={() => {}} />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modals */}
      <CreateBoardModal
        open={isCreateBoardOpen}
        onOpenChange={setIsCreateBoardOpen}
      />

      <NewProjectModal
        open={isNewProjectOpen}
        onOpenChange={(open) => {
          setIsNewProjectOpen(open);
          if (!open) setNewProjectColumnId(null);
        }}
        defaultBoardId={selectedBoardId || undefined}
        defaultColumnId={newProjectColumnId || undefined}
      />
    </div>
  );
}
