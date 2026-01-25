import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronDown, FolderKanban, Plus } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTheme } from '@/hooks/useTheme';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_PROJECTS = 8;
const STORAGE_KEY = 'sidebar-projects-open';

export function SidebarProjectsDropdown() {
  const location = useLocation();
  const { projectId } = useParams();
  const { data: projects = [], isLoading } = useProjects();
  const { isQuestMode } = useTheme();
  const { open: sidebarOpen } = useSidebar();
  
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  // Persist open state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  // Filter to active projects only
  const activeProjects = projects.filter(p => p.status === 'active');
  const visibleProjects = activeProjects.slice(0, MAX_VISIBLE_PROJECTS);
  const hasMoreProjects = activeProjects.length > MAX_VISIBLE_PROJECTS;

  const isProjectsPage = location.pathname === '/projects' || location.pathname.startsWith('/projects/');
  const isActiveProject = (id: string) => projectId === id;

  // When sidebar is collapsed, just show the icon that links to projects
  if (!sidebarOpen) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isProjectsPage}
                    className={cn(
                      "h-9 gap-3 transition-all duration-150",
                      isProjectsPage && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <Link to="/projects">
                      {isQuestMode ? (
                        <span className="text-base w-5 text-center">📁</span>
                      ) : (
                        <FolderKanban className="h-4 w-4" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Projects
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "h-9 gap-3 transition-all duration-150 w-full justify-between",
                    isProjectsPage && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isQuestMode ? (
                      <span className="text-base w-5 text-center">📁</span>
                    ) : (
                      <FolderKanban className="h-4 w-4" />
                    )}
                    <span className="truncate">Projects</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )} 
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
            </SidebarMenuItem>
          </SidebarMenu>

          <CollapsibleContent className="transition-all duration-200">
            <SidebarMenu className="pl-4 mt-1 space-y-0.5">
              {isLoading ? (
                <SidebarMenuItem>
                  <div className="h-8 px-3 flex items-center">
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                </SidebarMenuItem>
              ) : activeProjects.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-8 text-muted-foreground">
                    <Link to="/projects" className="flex items-center gap-2">
                      <Plus className="h-3 w-3" />
                      <span className="text-xs">Create a project</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <>
                  {visibleProjects.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton 
                        asChild
                        isActive={isActiveProject(project.id)}
                        className={cn(
                          "h-8 gap-2 transition-all duration-150",
                          isActiveProject(project.id) && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Link to={`/projects/${project.id}`}>
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: project.color || 'hsl(var(--muted-foreground))' }}
                          />
                          <span className="truncate text-sm">{project.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  
                  {hasMoreProjects && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className="h-8 text-muted-foreground hover:text-foreground">
                        <Link to="/projects" className="flex items-center gap-2">
                          <span className="text-xs">View all ({activeProjects.length})</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </>
              )}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
