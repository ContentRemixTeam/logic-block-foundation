import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectMutations } from '@/hooks/useProjects';
import { Project, PROJECT_COLORS } from '@/types/project';
import { cn } from '@/lib/utils';

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject?: Project | null;
  defaultBoardId?: string;
  defaultColumnId?: string;
}

export function NewProjectModal({ 
  open, 
  onOpenChange, 
  editingProject,
  defaultBoardId,
  defaultColumnId,
}: NewProjectModalProps) {
  const { createProject, updateProject } = useProjectMutations();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'archived'>('active');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);

  // Reset form when modal opens/closes or editing project changes
  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description || '');
      setStatus(editingProject.status);
      setColor(editingProject.color);
      setStartDate(editingProject.start_date || '');
      setEndDate(editingProject.end_date || '');
      setIsTemplate(editingProject.is_template);
    } else {
      setName('');
      setDescription('');
      setStatus('active');
      setColor(PROJECT_COLORS[0]);
      setStartDate('');
      setEndDate('');
      setIsTemplate(false);
    }
  }, [editingProject, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    const projectData: Partial<Project> = {
      name: name.trim(),
      description: description.trim() || null,
      status,
      color,
      start_date: startDate || null,
      end_date: endDate || null,
      is_template: isTemplate,
      ...(defaultBoardId && { board_id: defaultBoardId }),
      ...(defaultColumnId && { column_id: defaultColumnId }),
    };

    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, ...projectData }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createProject.mutate(projectData, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isSubmitting = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Template toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_template">Save as Template</Label>
              <p className="text-xs text-muted-foreground">
                Templates can be used to quickly create similar projects
              </p>
            </div>
            <Switch
              id="is_template"
              checked={isTemplate}
              onCheckedChange={setIsTemplate}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
