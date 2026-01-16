import { useNavigate } from 'react-router-dom';
import { Project } from '@/types/project';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Pencil, 
  Archive, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  Calendar,
  ListTodo
} from 'lucide-react';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onComplete: (project: Project) => void;
  onReactivate: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onArchive,
  onComplete,
  onReactivate,
  onDelete,
}: ProjectCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const getStatusBadge = () => {
    switch (project.status) {
      case 'completed':
        return <Badge variant="default" className="bg-success/20 text-success border-success/30">Completed</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Color indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: project.color }}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {project.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {project.status === 'active' && (
                <>
                  <DropdownMenuItem onClick={() => onComplete(project)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(project)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              {(project.status === 'completed' || project.status === 'archived') && (
                <DropdownMenuItem onClick={() => onReactivate(project)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(project)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            <span>{project.task_count || 0} tasks</span>
          </div>
          
          {(project.start_date || project.end_date) && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {project.start_date && format(new Date(project.start_date), 'MMM d')}
                {project.start_date && project.end_date && ' - '}
                {project.end_date && format(new Date(project.end_date), 'MMM d')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          {project.is_template && (
            <Badge variant="outline" className="text-xs">Template</Badge>
          )}
          {getStatusBadge()}
        </div>
      </CardContent>
    </Card>
  );
}
