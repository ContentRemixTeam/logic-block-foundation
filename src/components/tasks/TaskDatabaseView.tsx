import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Task } from '@/components/tasks/types';
import { Search, Plus, Settings2, MoreHorizontal, Trash2, Calendar, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDatabaseViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onAddTask: () => void;
  onOpenFilters: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function TaskDatabaseView({
  tasks,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onOpenFilters,
  searchQuery,
  onSearchChange,
}: TaskDatabaseViewProps) {
  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'low':
        return 'bg-primary/10 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string | null, isCompleted: boolean) => {
    if (isCompleted) {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Done</Badge>;
    }
    switch (status) {
      case 'in_progress':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">In Progress</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Waiting</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Scheduled</Badge>;
      case 'someday':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Someday</Badge>;
      default:
        return <Badge variant="outline">Backlog</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Database</h2>
          <p className="text-muted-foreground text-sm">Manage and filter all your tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onAddTask} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
          <Button variant="outline" onClick={() => {}}>
            Manage Fields
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={onOpenFilters} className="gap-2">
          <Settings2 className="h-4 w-4" />
          Advanced Filters
        </Button>
        <Button variant="outline" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Saved Filters (0)
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Showing {tasks.length} of {tasks.length} tasks
      </p>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12"></TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24">Priority</TableHead>
              <TableHead className="w-28">Due Date</TableHead>
              <TableHead className="w-32">Tags</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No tasks found. Create your first task to get started.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.task_id} className="group">
                  <TableCell>
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => onToggleComplete(task.task_id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={cn('font-medium', task.is_completed && 'line-through text-muted-foreground')}>
                        {task.task_text}
                      </p>
                      {task.task_description && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {task.task_description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status, task.is_completed)}</TableCell>
                  <TableCell>
                    {task.priority && (
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.scheduled_date ? format(parseISO(task.scheduled_date), 'MMM d') : '-'}
                  </TableCell>
                  <TableCell>
                    {task.context_tags && task.context_tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {task.context_tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {task.context_tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{task.context_tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteTask(task)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
