import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useProjects, useProjectMutations } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { ProjectBoardView } from '@/components/projects/ProjectBoardView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FolderKanban, Archive, CheckCircle2, Copy, LayoutGrid, List } from 'lucide-react';
import { Project, ProjectStatus } from '@/types/project';

type ViewMode = 'list' | 'board';

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { deleteProject, updateProject } = useProjectMutations();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<ProjectStatus | 'templates'>('active');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    if (activeTab === 'templates') {
      return projects.filter(p => p.is_template);
    }
    
    return projects.filter(p => p.status === activeTab && !p.is_template);
  }, [projects, activeTab]);

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsNewProjectModalOpen(true);
  };

  const handleArchiveProject = (project: Project) => {
    updateProject.mutate({ id: project.id, status: 'archived' });
  };

  const handleCompleteProject = (project: Project) => {
    updateProject.mutate({ id: project.id, status: 'completed' });
  };

  const handleReactivateProject = (project: Project) => {
    updateProject.mutate({ id: project.id, status: 'active' });
  };

  const handleDeleteProject = (project: Project) => {
    if (confirm('Are you sure you want to delete this project? Tasks will be removed from the project but not deleted.')) {
      deleteProject.mutate(project.id);
    }
  };

  const handleCloseModal = () => {
    setIsNewProjectModalOpen(false);
    setEditingProject(null);
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'active': return <FolderKanban className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      case 'templates': return <Copy className="h-4 w-4" />;
      default: return null;
    }
  };

  const getEmptyState = () => {
    switch (activeTab) {
      case 'active':
        return {
          title: 'No active projects',
          description: 'Create your first project to organize your tasks into focused workstreams.',
          showCta: true,
        };
      case 'completed':
        return {
          title: 'No completed projects',
          description: 'Projects you mark as complete will appear here.',
          showCta: false,
        };
      case 'archived':
        return {
          title: 'No archived projects',
          description: 'Archived projects will appear here for reference.',
          showCta: false,
        };
      case 'templates':
        return {
          title: 'No project templates',
          description: 'Save projects as templates to quickly create similar projects in the future.',
          showCta: true,
        };
      default:
        return { title: '', description: '', showCta: false };
    }
  };

  const emptyState = getEmptyState();

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Organize your tasks into focused projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setIsNewProjectModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {viewMode === 'board' ? (
          <ProjectBoardView onSwitchToList={() => setViewMode('list')} />
        ) : (
          /* List View with Tabs */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProjectStatus | 'templates')}>
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                {getTabIcon('active')}
                Active
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                {getTabIcon('completed')}
                Completed
              </TabsTrigger>
              <TabsTrigger value="archived" className="gap-2">
                {getTabIcon('archived')}
                Archived
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                {getTabIcon('templates')}
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FolderKanban className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">{emptyState.title}</h3>
                  <p className="text-muted-foreground max-w-sm mt-1">
                    {emptyState.description}
                  </p>
                  {emptyState.showCta && (
                    <Button 
                      onClick={() => setIsNewProjectModalOpen(true)} 
                      className="mt-4 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={handleEditProject}
                      onArchive={handleArchiveProject}
                      onComplete={handleCompleteProject}
                      onReactivate={handleReactivateProject}
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* New/Edit Project Modal */}
        <NewProjectModal
          open={isNewProjectModalOpen}
          onOpenChange={handleCloseModal}
          editingProject={editingProject}
        />
      </div>
    </Layout>
  );
}
