import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProject, useProjectMutations } from '@/hooks/useProjects';
import { useTasks, useTaskMutations } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MondayBoardView } from '@/components/projects/monday-board';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Pencil, 
  Calendar,
  MoreHorizontal,
  Archive,
  CheckCircle2,
  Trash2,
  ListTodo,
  Lightbulb,
  Edit,
  Clock,
  FolderKanban,
  Hash,
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
import { cn } from '@/lib/utils';

interface Idea {
  id: string;
  content: string;
  category_id: string | null;
  priority: string | null;
  tags: string[];
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_OPTIONS = [
  { value: 'asap', label: 'ASAP', color: 'bg-red-500' },
  { value: 'next_week', label: 'Next Week', color: 'bg-orange-500' },
  { value: 'next_month', label: 'Next Month', color: 'bg-blue-500' },
  { value: 'someday', label: 'Someday', color: 'bg-gray-500' },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const project = useProject(id);
  const { data: allTasks } = useTasks();
  const { updateProject, deleteProject } = useProjectMutations();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tasks' | 'ideas'>('tasks');
  const [projectIdeas, setProjectIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  // Filter tasks for this project
  const projectTasks = useMemo(() => {
    if (!allTasks || !id) return [];
    return allTasks.filter(task => task.project_id === id);
  }, [allTasks, id]);

  // Load ideas for this project
  const loadProjectIdeas = useCallback(async () => {
    if (!user || !id) return;
    
    setLoadingIdeas(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-ideas');
      if (error) throw error;
      
      const allIdeas = Array.isArray(data?.ideas) ? data.ideas : [];
      const filtered = allIdeas.filter((idea: any) => idea.project_id === id);
      setProjectIdeas(filtered.map((idea: any) => ({
        id: idea.id,
        content: idea.content || '',
        category_id: idea.category_id || null,
        priority: idea.priority || null,
        tags: Array.isArray(idea.tags) ? idea.tags : [],
        project_id: idea.project_id || null,
        created_at: idea.created_at || '',
        updated_at: idea.updated_at || '',
      })));
    } catch (error) {
      console.error('Error loading project ideas:', error);
    } finally {
      setLoadingIdeas(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (viewMode === 'ideas') {
      loadProjectIdeas();
    }
  }, [viewMode, loadProjectIdeas]);

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

  const getPriorityOption = (value: string | null) => {
    if (!value) return null;
    return PRIORITY_OPTIONS.find((p) => p.value === value);
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
              {/* View Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'tasks' | 'ideas')}>
                <TabsList>
                  <TabsTrigger value="tasks" className="gap-2">
                    <ListTodo className="h-4 w-4" />
                    Tasks
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {projectTasks.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="ideas" className="gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Ideas
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {projectIdeas.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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
        <div className="flex-1 overflow-hidden">
          {viewMode === 'tasks' ? (
            <MondayBoardView projectId={project.id} tasks={projectTasks} />
          ) : (
            <div className="p-4 h-full overflow-auto">
              {loadingIdeas ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : projectIdeas.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No ideas linked to this project yet.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add ideas from the Ideas page and assign them to this project.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/ideas')}
                    >
                      Go to Ideas
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projectIdeas.map((idea) => {
                    const priorityOpt = getPriorityOption(idea.priority);
                    return (
                      <Card key={idea.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {priorityOpt && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Clock className="h-3 w-3" />
                                    {priorityOpt.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{idea.content}</p>
                              {idea.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {idea.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate('/ideas')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(idea.created_at).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
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
