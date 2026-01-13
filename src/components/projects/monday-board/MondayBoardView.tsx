import { useState, useMemo } from 'react';
import { Task } from '@/components/tasks/types';
import { ProjectSection, BOARD_COLUMNS } from '@/types/project';
import { BoardGroup } from './BoardGroup';
import { BoardToolbar } from './BoardToolbar';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';
import { ColumnCustomizer } from './ColumnCustomizer';
import { useProjectSections, useProjectSectionMutations, useProjectBoardSettings, useProjectBoardSettingsMutations } from '@/hooks/useProjectSections';
import { useTaskMutations } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MondayBoardViewProps {
  projectId: string;
  tasks: Task[];
}

export function MondayBoardView({ projectId, tasks }: MondayBoardViewProps) {
  const { data: sections = [] } = useProjectSections(projectId);
  const { data: boardSettings } = useProjectBoardSettings(projectId);
  const { createSection } = useProjectSectionMutations(projectId);
  const { updateSettings } = useProjectBoardSettingsMutations(projectId);
  const { updateTask, deleteTask, createTask, toggleComplete } = useTaskMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isColumnCustomizerOpen, setIsColumnCustomizerOpen] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Get visible columns from settings or use defaults
  const visibleColumns = useMemo(() => {
    return boardSettings?.visible_columns || BOARD_COLUMNS.map(c => c.id);
  }, [boardSettings]);

  // Group tasks by section
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = { unsectioned: [] };
    
    sections.forEach(section => {
      grouped[section.id] = [];
    });

    tasks.forEach(task => {
      // Apply search filter
      if (searchQuery && !task.task_text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      // Apply other filters
      if (filters.status && task.status !== filters.status) return;
      if (filters.priority && task.priority !== filters.priority) return;

      if (task.section_id && grouped[task.section_id]) {
        grouped[task.section_id].push(task);
      } else {
        grouped.unsectioned.push(task);
      }
    });

    // Apply sorting
    if (sortConfig) {
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => {
          const aVal = a[sortConfig.field as keyof Task];
          const bVal = b[sortConfig.field as keyof Task];
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      });
    }

    return grouped;
  }, [tasks, sections, searchQuery, filters, sortConfig]);

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      createSection.mutate({ name: newGroupName.trim() });
      setNewGroupName('');
      setIsAddingGroup(false);
    }
  };

  const handleUpdateVisibleColumns = (columns: string[]) => {
    updateSettings.mutate({ visible_columns: columns });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleToggleComplete = (taskId: string) => {
    toggleComplete.mutate(taskId);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask.mutate({ taskId, updates });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate({ taskId });
    }
  };

  const handleCreateTask = (text: string, sectionId?: string) => {
    createTask.mutate({ 
      task_text: text, 
      project_id: projectId,
      section_id: sectionId || null,
    });
  };

  const handleMoveToSection = (taskId: string, sectionId: string | null) => {
    updateTask.mutate({ taskId, updates: { section_id: sectionId } });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <BoardToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        onOpenColumnCustomizer={() => setIsColumnCustomizerOpen(true)}
        onAddTask={() => handleCreateTask('New task')}
        onAddGroup={() => setIsAddingGroup(true)}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Table Header */}
          <div className="sticky top-0 z-10 bg-background border-b flex items-center">
            {BOARD_COLUMNS.filter(col => visibleColumns.includes(col.id)).map((column, index) => (
              <div
                key={column.id}
                className={`px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap border-r ${
                  index === 0 ? 'sticky left-0 z-20 bg-background' : ''
                }`}
                style={{ width: column.width, minWidth: column.width }}
              >
                {column.label}
              </div>
            ))}
            <div className="flex-1 min-w-[60px]" />
          </div>

          {/* Sections */}
          {sections.map(section => (
            <BoardGroup
              key={section.id}
              section={section}
              tasks={tasksBySection[section.id] || []}
              visibleColumns={visibleColumns}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onCreateTask={(text) => handleCreateTask(text, section.id)}
              onMoveToSection={handleMoveToSection}
              allSections={sections}
            />
          ))}

          {/* Unsectioned tasks */}
          {tasksBySection.unsectioned.length > 0 && (
            <BoardGroup
              section={{ id: 'unsectioned', name: 'Uncategorized', color: '#64748B', sort_order: 999, project_id: projectId, user_id: '', created_at: '', updated_at: '' }}
              tasks={tasksBySection.unsectioned}
              visibleColumns={visibleColumns}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onCreateTask={(text) => handleCreateTask(text)}
              onMoveToSection={handleMoveToSection}
              allSections={sections}
              isUnsectioned
            />
          )}

          {/* Empty state */}
          {sections.length === 0 && tasksBySection.unsectioned.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              {isAddingGroup ? (
                <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddGroup();
                      if (e.key === 'Escape') setIsAddingGroup(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddGroup}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingGroup(false)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <p className="text-lg mb-4">No tasks yet</p>
                  <Button onClick={() => setIsAddingGroup(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first group
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Add Group Button */}
          {(sections.length > 0 || tasksBySection.unsectioned.length > 0) && (
            <div className="p-4 border-t">
              {isAddingGroup ? (
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddGroup();
                      if (e.key === 'Escape') setIsAddingGroup(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddGroup}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingGroup(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="ghost" className="text-muted-foreground" onClick={() => setIsAddingGroup(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Group
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      {/* Column Customizer */}
      <ColumnCustomizer
        open={isColumnCustomizerOpen}
        onOpenChange={setIsColumnCustomizerOpen}
        visibleColumns={visibleColumns}
        onUpdate={handleUpdateVisibleColumns}
        projectId={projectId}
      />
    </div>
  );
}
