import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Sparkles, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useProjects, useProjectMutations } from '@/hooks/useProjects';
import { PROJECT_COLORS } from '@/types/project';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ProjectSelectorProps {
  value: string | null;
  onChange: (projectId: string | null) => void;
  suggestedName?: string;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
  showNoneOption?: boolean;
  label?: string;
}

export function ProjectSelector({
  value,
  onChange,
  suggestedName,
  placeholder = 'Select project...',
  className,
  allowCreate = true,
  showNoneOption = true,
  label,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

  const { data: projects = [], isLoading } = useProjects();
  const { createProject } = useProjectMutations();

  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'active' && !p.is_template),
    [projects]
  );

  const selectedProject = useMemo(
    () => projects.find(p => p.id === value),
    [projects, value]
  );

  const handleOpenCreateDialog = () => {
    setNewProjectName(suggestedName || '');
    setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
    setShowCreateDialog(true);
    setOpen(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    createProject.mutate(
      {
        name: newProjectName.trim(),
        color: newProjectColor,
        status: 'active',
      },
      {
        onSuccess: (project) => {
          if (project?.id) {
            onChange(project.id);
          }
          setShowCreateDialog(false);
          setNewProjectName('');
        },
      }
    );
  };

  return (
    <>
      <div className={cn('space-y-1.5', className)}>
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={isLoading}
            >
              {selectedProject ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                  <span className="truncate">{selectedProject.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search projects..." />
              <CommandList>
                <CommandEmpty>No projects found.</CommandEmpty>

                {showNoneOption && (
                  <CommandGroup>
                    <CommandItem
                      value="none"
                      onSelect={() => {
                        onChange(null);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === null ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="text-muted-foreground">No project</span>
                    </CommandItem>
                  </CommandGroup>
                )}

                {activeProjects.length > 0 && (
                  <CommandGroup heading="Active Projects">
                    {activeProjects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.name}
                        onSelect={() => {
                          onChange(project.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === project.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="truncate">{project.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {allowCreate && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      {suggestedName && (
                        <CommandItem
                          value={`create-suggested-${suggestedName}`}
                          onSelect={() => {
                            setNewProjectName(suggestedName);
                            setNewProjectColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
                            setShowCreateDialog(true);
                            setOpen(false);
                          }}
                        >
                          <Sparkles className="mr-2 h-4 w-4 text-primary" />
                          <span>Create "{suggestedName}"</span>
                        </CommandItem>
                      )}
                      <CommandItem
                        value="create-new"
                        onSelect={handleOpenCreateDialog}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Create new project...</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Create New Project
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      'w-7 h-7 rounded-full transition-all',
                      newProjectColor === c
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewProjectColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || createProject.isPending}
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
