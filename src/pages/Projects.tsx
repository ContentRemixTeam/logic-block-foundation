import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useProjects, useProjectMutations } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { ProjectBoardView } from '@/components/projects/ProjectBoardView';
import { PageHeader, ViewSwitcher, EmptyState, SkeletonList } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FolderKanban, 
  Archive, 
  CheckCircle2, 
  Copy, 
  LayoutGrid, 
  List, 
  Table2,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import { Project, ProjectStatus } from '@/types/project';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board' | 'table' | 'calendar';
type TabFilter = ProjectStatus | 'templates';

const VIEW_OPTIONS = [
  { id: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
  { id: 'board', label: 'Board', icon: <LayoutGrid className="h-4 w-4" /> },
];

const TAB_OPTIONS: { id: TabFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'active', label: 'Active', icon: <FolderKanban className="h-4 w-4" /> },
  { id: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: 'archived', label: 'Archived', icon: <Archive className="h-4 w-4" /> },
  { id: 'templates', label: 'Templates', icon: <Copy className="h-4 w-4" /> },
];

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { deleteProject, updateProject } = useProjectMutations();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    let result = projects;
    
    // Filter by tab
    if (activeTab === 'templates') {
      result = result.filter(p => p.is_template);
    } else {
      result = result.filter(p => p.status === activeTab && !p.is_template);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [projects, activeTab, searchQuery]);

  const projectCounts = useMemo(() => {
    if (!projects) return { active: 0, completed: 0, archived: 0, templates: 0 };
    return {
      active: projects.filter(p => p.status === 'active' && !p.is_template).length,
      completed: projects.filter(p => p.status === 'completed' && !p.is_template).length,
      archived: projects.filter(p => p.status === 'archived' && !p.is_template).length,
      templates: projects.filter(p => p.is_template).length,
    };
  }, [projects]);

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
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject.mutate(project.id);
    }
  };

  const handleCloseModal = () => {
    setIsNewProjectModalOpen(false);
    setEditingProject(null);
  };

  const getEmptyState = () => {
    if (searchQuery) {
      return {
        title: 'No projects found',
        description: `No projects match "${searchQuery}". Try a different search term.`,
        showCta: false,
      };
    }
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
          description: 'Save projects as templates to quickly create similar projects.',
          showCta: true,
        };
      default:
        return { title: '', description: '', showCta: false };
    }
  };

  const emptyState = getEmptyState();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Projects"
          description="Organize your work into focused projects"
          icon={<FolderKanban className="h-5 w-5 text-primary" />}
          actions={
            <Button onClick={() => setIsNewProjectModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          }
        >
          {/* Toolbar Row */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            {/* Tab Filters */}
            <div className="flex items-center gap-1">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "ml-1 h-5 min-w-[20px] px-1.5 text-[10px]",
                      activeTab === tab.id && "bg-primary/20"
                    )}
                  >
                    {projectCounts[tab.id as keyof typeof projectCounts]}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px] h-9"
                />
              </div>

              {/* View Switcher */}
              <ViewSwitcher
                views={VIEW_OPTIONS}
                activeView={viewMode}
                onViewChange={(v) => setViewMode(v as ViewMode)}
              />
            </div>
          </div>
        </PageHeader>

        {/* Content */}
        {viewMode === 'board' ? (
          <ProjectBoardView onSwitchToList={() => setViewMode('list')} />
        ) : (
          <div className="animate-fade-in">
            {isLoading ? (
              <SkeletonList count={6} />
            ) : filteredProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-12 w-12" />}
                title={emptyState.title}
                description={emptyState.description}
                action={emptyState.showCta ? {
                  label: 'Create Project',
                  onClick: () => setIsNewProjectModalOpen(true),
                } : undefined}
              />
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
          </div>
        )}

        {/* Modal */}
        <NewProjectModal
          open={isNewProjectModalOpen}
          onOpenChange={handleCloseModal}
          editingProject={editingProject}
        />
      </div>
    </Layout>
  );
}