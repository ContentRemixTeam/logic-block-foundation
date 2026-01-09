import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject, useProjectMutations } from '@/hooks/useProjects';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { TaskKanbanBoard } from '@/components/projects/TaskKanbanBoard';
import { UncategorizedTasksPanel } from '@/components/projects/UncategorizedTasksPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Pencil, 
  Calendar,
  MoreHorizontal,
  Archive,
  CheckCircle2,
  Trash2,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { Task } from '@/components/tasks/types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useProject(id);
  const { data: allTasks } = useTasks();
  const { updateProject, deleteProject } = useProjectMutations();
  const { toggleComplete, updateTask, deleteTask } = useTaskMutations();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showUncategorizedPanel, setShowUncategorizedPanel] = useState(false);

  // Filter tasks for this project
  const projectTasks = useMemo(() => {
    if (!allTasks || !id) return [];
    return allTasks.filter(task => task.project_id === id);
  }, [allTasks, id]);

  // Filter uncategorized tasks (no project)
  const uncategorizedTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(task => !task.project_id && !task.is_completed);
  }, [allTasks]);

  const handleBack = () => {
    navigate('/projects');
  };

  const handleArchive = () => {
    if (!project) return;
    updateProject.mutate({ id: project.id, status: 'archived' }, {
      onSuccess: () => navigate('/projects'),
    });
  };

  const handleComplete = () => {
    if (!project) return;
    updateProject.mutate({ id: project.id, status: 'completed' }, {
      onSuccess: () => navigate('/projects'),
    });
  };

  const handleDelete = () => {
    if (!project) return;
    if (confirm('Are you sure you want to delete this project? Tasks will be removed from the project but not deleted.')) {
      deleteProject.mutate(project.id, {
        onSuccess: () => navigate('/projects'),
      });
    }
  };

  const handleTaskToggle = (taskId: string) => {
    toggleComplete.mutate(taskId);
  };

  const handleUpdateTaskColumn = (taskId: string, column: 'todo' | 'in_progress' | 'done') => {
    updateTask.mutate({ taskId, updates: { project_column: column } });
  };

  if (!project) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Project not found</h2>
            <Button onClick={handleBack} variant="link" className="mt-2">
              Back to Projects
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h1 className="text-xl font-semibold">{project.name}</h1>
                
                {project.is_template && (
                  <Badge variant="outline">Template</Badge>
                )}
                
                {project.status === 'completed' && (
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                    Completed
                  </Badge>
                )}
                
                {project.status === 'archived' && (
                  <Badge variant="secondary">Archived</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(project.start_date || project.end_date) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mr-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {project.start_date && format(new Date(project.start_date), 'MMM d')}
                    {project.start_date && project.end_date && ' - '}
                    {project.end_date && format(new Date(project.end_date), 'MMM d')}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUncategorizedPanel(!showUncategorizedPanel)}
                className="gap-2"
              >
                {showUncategorizedPanel ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
                Add Tasks
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleComplete}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {project.description && (
            <div className="px-4 pb-4">
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Kanban Board */}
          <div className="flex-1 overflow-auto">
            <TaskKanbanBoard
              tasks={projectTasks}
              projectId={project.id}
              onTaskToggle={handleTaskToggle}
              onUpdateColumn={handleUpdateTaskColumn}
              onDeleteTask={(taskId) => {
                if (confirm('Are you sure you want to delete this task?')) {
                  deleteTask.mutate({ taskId });
                }
              }}
            />
          </div>

          {/* Uncategorized Tasks Panel */}
          {showUncategorizedPanel && (
            <UncategorizedTasksPanel
              tasks={uncategorizedTasks}
              projectId={project.id}
              onClose={() => setShowUncategorizedPanel(false)}
            />
          )}
        </div>

        {/* Edit Modal */}
        <NewProjectModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          editingProject={project}
        />
      </div>
    </Layout>
  );
}
